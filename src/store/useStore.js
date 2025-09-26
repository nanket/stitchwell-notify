import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import toast from 'react-hot-toast';
import { getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, where, serverTimestamp, getDocs, getDoc, arrayUnion, arrayRemove, writeBatch, limit } from 'firebase/firestore';
import { initFirebase } from '../firebase';
import { tGlobal, translateStatus, translateClothType } from '../i18n';

// Compute push endpoint from environment. Keep simple and explicit to avoid misconfiguration.
function getPushEndpoint() {
  return import.meta.env.VITE_PUSH_ENDPOINT || '';
}
const REGISTER_TOKEN_ENDPOINT = import.meta.env.VITE_REGISTER_TOKEN_ENDPOINT || '';

// Firestore helpers and listeners (module-scoped)
let _db = null;
let _unsubCloth = null;
let _unsubWorkers = null;
let _unsubNotifs = null;

async function seedWorkersIfEmpty(db) {
  // Seed Firestore with initialWorkers if the collection is empty
  const snap = await getDocs(collection(db, 'workers'));
  if (snap.empty) {
    const batchPromises = Object.entries(initialWorkers).map(([role, names]) =>
      setDoc(doc(db, 'workers', role), { list: names, updatedAt: serverTimestamp() }, { merge: true })
    );
    await Promise.allSettled(batchPromises);
  }
}

async function fixUnassignedItems(db, workersMap) {
  // Auto-assign unassigned thread-matching items to default threading worker
  const threadingAssignee = workersMap[USER_ROLES.THREADING_WORKER]?.[0];
  if (!threadingAssignee) return;
  try {
    const q = query(
      collection(db, 'clothItems'),
      where('status', '==', WORKFLOW_STATES.AWAITING_THREAD_MATCHING),
      where('assignedTo', '==', null)
    );
    const unassigned = await getDocs(q);
    const updates = [];
    unassigned.forEach((d) => {
      updates.push(
        updateDoc(doc(db, 'clothItems', d.id), {
          assignedTo: threadingAssignee,
          updatedAt: serverTimestamp(),
        })
      );
    });
    if (updates.length) await Promise.allSettled(updates);
  } catch (_) {}
}

async function ensureDb() {
  if (_db) return _db;
  await initFirebase();
  _db = getFirestore();
  return _db;
}

// Load persisted FCM tokens (client-only)
let persistedFcmTokens = {};
try {
  const raw = localStorage.getItem('fcmTokens');
  if (raw) persistedFcmTokens = JSON.parse(raw);
} catch (_) {}

// Normalize Firestore Timestamp/Date/string to ISO string (or null)
function toISO(v) {
  try {
    if (!v) return null;
    if (typeof v.toDate === 'function') return v.toDate().toISOString();
    if (typeof v === 'number') return new Date(v).toISOString();
    if (typeof v === 'string') {
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }
    return null;
  } catch (_) {
    return null;
  }
}


// Define the workflow states and their transitions
// Updated to match required business flow:
// 1) Cutting -> 2) Thread Matching -> 3) Tailor Assignment (Admin) -> 4) Tailoring -> 5) Kaach (conditional) -> 6) Ironing -> 7) Packaging -> 8) Ready
export const WORKFLOW_STATES = {
  AWAITING_CUTTING: 'Awaiting Cutting',
  AWAITING_THREAD_MATCHING: 'Awaiting Thread Matching',
  AWAITING_TAILOR_ASSIGNMENT: 'Awaiting Tailor Assignment',
  AWAITING_STITCHING: 'Awaiting Stitching',
  AWAITING_KAACH: 'Awaiting Kaach',
  AWAITING_IRONING: 'Awaiting Ironing',
  AWAITING_PACKAGING: 'Awaiting Packaging',
  READY: 'Ready'
};

// Friendly stage label from status constant
function stageFromStatus(status) {
  switch (status) {
    case WORKFLOW_STATES.AWAITING_CUTTING: return 'cutting';
    case WORKFLOW_STATES.AWAITING_THREAD_MATCHING: return 'thread matching';
    case WORKFLOW_STATES.AWAITING_TAILOR_ASSIGNMENT: return 'tailor assignment';
    case WORKFLOW_STATES.AWAITING_STITCHING: return 'stitching';
    case WORKFLOW_STATES.AWAITING_KAACH: return 'kaach';
    case WORKFLOW_STATES.AWAITING_IRONING: return 'ironing';
    case WORKFLOW_STATES.AWAITING_PACKAGING: return 'packaging';
    case WORKFLOW_STATES.READY: return 'ready';
    default: return String(status || '').toLowerCase();
  }
}


// Define user roles and their assigned workers
export const USER_ROLES = {
  ADMIN: 'Admin',
  THREADING_WORKER: 'Threading Worker',
  CUTTING_WORKER: 'Cutting Worker',
  TAILOR: 'Tailor',
  BUTTONING_WORKER: 'Buttoning Worker',
  IRONING_WORKER: 'Ironing Worker',
  PACKAGING_WORKER: 'Packaging Worker'
};


// Map stage -> recipient role
function roleFromStage(stage) {
  switch ((stage || '').toLowerCase()) {
    case 'cutting': return USER_ROLES.CUTTING_WORKER;
    case 'thread matching': return USER_ROLES.THREADING_WORKER;
    case 'tailor assignment': return USER_ROLES.ADMIN;
    case 'stitching': return USER_ROLES.TAILOR;
    case 'kaach': return USER_ROLES.BUTTONING_WORKER;
    case 'ironing': return USER_ROLES.IRONING_WORKER;
    case 'packaging': return USER_ROLES.PACKAGING_WORKER;
    case 'ready': return USER_ROLES.ADMIN;
    default: return null;
  }
}

function pickVariant(keys) {
  if (!Array.isArray(keys) || keys.length === 0) return '';
  const idx = Math.floor(Math.random() * keys.length);
  return keys[Math.min(keys.length - 1, Math.max(0, idx))];
}

function tOr(key, params, fallback) {
  const res = tGlobal(key, params);
  return res === key ? fallback : res;
}

// Build localized, concise, context-aware notification title/body
function buildNotification({ kind, stage, bill, typeLabel, recipientRole }) {
  const p = { bill, type: typeLabel, stage, role: recipientRole };
  if (kind === 'assign') {
    let titleKeys = ['notify.assign.generic.title_1'];
    let bodyKeys = ['notify.assign.generic.body_1'];
    switch ((stage || '').toLowerCase()) {
      case 'cutting':
        titleKeys = ['notify.assign.cutting.title_1', 'notify.assign.cutting.title_2'];
        bodyKeys = ['notify.assign.cutting.body_1', 'notify.assign.cutting.body_2'];
        break;
      case 'thread matching':
        titleKeys = ['notify.assign.threading.title_1', 'notify.assign.threading.title_2'];
        bodyKeys = ['notify.assign.threading.body_1', 'notify.assign.threading.body_2'];
        break;
      case 'stitching':
        titleKeys = ['notify.assign.stitching.title_1', 'notify.assign.stitching.title_2'];
        bodyKeys = ['notify.assign.stitching.body_1', 'notify.assign.stitching.body_2'];
        break;
      case 'kaach':
        titleKeys = ['notify.assign.kaach.title_1'];
        bodyKeys = ['notify.assign.kaach.body_1'];
        break;
      case 'ironing':
        titleKeys = ['notify.assign.ironing.title_1'];
        bodyKeys = ['notify.assign.ironing.body_1'];
        break;
      case 'packaging':
        titleKeys = ['notify.assign.packaging.title_1'];
        bodyKeys = ['notify.assign.packaging.body_1'];
        break;
    }
    const fallbackTitle = tGlobal('store.new_task_title', p);
    const fallbackBody = (stage && stage.toLowerCase() === 'cutting')
      ? tGlobal('store.new_task_body_cutting', p)
      : tGlobal('store.new_task_body_stage', p);
    const title = tOr(pickVariant(titleKeys), p, fallbackTitle);
    const body = tOr(pickVariant(bodyKeys), p, fallbackBody);
    return { title, body };
  }
  if (kind === 'progress') {
    const title = tOr(pickVariant(['notify.progress.to_stage.title_1', 'notify.progress.to_stage.title_2']), p, tGlobal('store.task_done_title', p));
    const body = tOr(pickVariant(['notify.progress.to_stage.body_1', 'notify.progress.to_stage.body_2']), p, tGlobal('store.task_done_body', p));
    return { title, body };
  }
  return { title: tGlobal('store.push_task'), body: tGlobal('store.push_update') };
}

// Predefined workers for each role (admin can edit later from UI)
const initialWorkers = {
  [USER_ROLES.ADMIN]: ['Admin'],
  [USER_ROLES.CUTTING_WORKER]: ['Feroz'],
  [USER_ROLES.THREADING_WORKER]: ['Abdul'], // Thread matching
  [USER_ROLES.TAILOR]: ['Salim', 'Hanif', 'Shiv Muhrat', 'Lala', 'Mama', 'Mehboob', 'Shambhu'],
  [USER_ROLES.BUTTONING_WORKER]: ['Abdul'], // Kaach
  [USER_ROLES.IRONING_WORKER]: ['Abdul Kadir'],
  [USER_ROLES.PACKAGING_WORKER]: ['Abdul Kadir']
};

// Define cloth types
export const CLOTH_TYPES = ['Shirt', 'Pant', 'Kurta', 'Safari'];

// Compute next transition dynamically using current workers and item type

// Helpers for Firestore-backed users
function _baseUsername(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    // Remove diacritics using explicit Unicode range for combining marks (Android Chrome safe)
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}
async function _generateUniqueUsername(db, base) {
  let uname = base || 'user';
  let i = 0;
  // Limit attempts to avoid infinite loop
  while (i < 100) {
    const snap = await getDoc(doc(db, 'users', uname));
    if (!snap.exists()) return uname;
    i += 1;
    uname = `${base}${i}`;
  }
  return `${base}${Date.now().toString(36)}`;
}
function _generatePassword(username) {
  // Per requirement: username + 1234
  return `${username}1234`;
}

const computeNextTransition = (item, workers) => {
  const status = item.status;
  const type = (item.type || '').toLowerCase();
  switch (status) {
    case WORKFLOW_STATES.AWAITING_CUTTING:
      return { nextState: WORKFLOW_STATES.AWAITING_THREAD_MATCHING, assignedTo: workers[USER_ROLES.THREADING_WORKER]?.[0] || null };
    case WORKFLOW_STATES.AWAITING_THREAD_MATCHING:
      return { nextState: WORKFLOW_STATES.AWAITING_TAILOR_ASSIGNMENT, assignedTo: workers[USER_ROLES.ADMIN]?.[0] || null };
    case WORKFLOW_STATES.AWAITING_TAILOR_ASSIGNMENT:
      return { nextState: WORKFLOW_STATES.AWAITING_STITCHING, assignedTo: item.assignedTo || null }; // tailor should already be selected
    case WORKFLOW_STATES.AWAITING_STITCHING:
      if (type === 'pant') {
        return { nextState: WORKFLOW_STATES.AWAITING_IRONING, assignedTo: workers[USER_ROLES.IRONING_WORKER]?.[0] || null };
      }
      return { nextState: WORKFLOW_STATES.AWAITING_KAACH, assignedTo: workers[USER_ROLES.BUTTONING_WORKER]?.[0] || null };
    case WORKFLOW_STATES.AWAITING_KAACH:
      return { nextState: WORKFLOW_STATES.AWAITING_IRONING, assignedTo: workers[USER_ROLES.IRONING_WORKER]?.[0] || null };
    case WORKFLOW_STATES.AWAITING_IRONING:
      return { nextState: WORKFLOW_STATES.AWAITING_PACKAGING, assignedTo: workers[USER_ROLES.PACKAGING_WORKER]?.[0] || null };
    case WORKFLOW_STATES.AWAITING_PACKAGING:
      return { nextState: WORKFLOW_STATES.READY, assignedTo: null };
    default:
      return null;
  }
};

// Generate unique ID for cloth items


const useStore = create(
  devtools(
    (set, get) => ({
      // Current user state
      currentUser: null,
      currentUserRole: null,

      // Cloth items array
      clothItems: [],

      // Notification state
      notifications: [],

      // Actions
      setCurrentUser: (user, role) => {
        set({ currentUser: user, currentUserRole: role });
        // Persist to localStorage
        try {
          localStorage.setItem('stitchwell_user', JSON.stringify({ user, role }));
        } catch (_) {}
        // subscribe notifications for this user and ensure backend listeners
        try {
          get().initBackendSync();
          if (user) get()._subscribeNotifications(user);
        } catch (_) {}
      },

      // Credential-based login backed by Firestore 'users' collection.
      // Falls back to legacy hardcoded users for backward compatibility.
      loginWithCredentials: async (username, password) => {
        try {
          const db = await ensureDb();
          const u = String(username || '').toLowerCase().replace(/\s+/g, '');
          const userDoc = await getDoc(doc(db, 'users', u));
          if (userDoc.exists()) {
            const data = userDoc.data() || {};
            if (String(password || '') !== String(data.password || '')) {
              toast.error(tGlobal('auth.invalid_login'));
              return false;
            }
            get().setCurrentUser(data.name || u, data.role || null);
            return true;
          }
        } catch (e) {
          // proceed to legacy fallback
        }
        // Legacy fallback (hardcoded users)
        const u2 = String(username || '').toLowerCase().replace(/\s+/g, '');
        const users = {
          admin:        { name: 'Admin', role: USER_ROLES.ADMIN,              password: 'admin1234' },
          feroz:        { name: 'Feroz', role: USER_ROLES.CUTTING_WORKER,     password: 'feroz1234' },
          abdul:        { name: 'Abdul', role: USER_ROLES.THREADING_WORKER,   password: 'abdul1234' },
          salim:        { name: 'Salim', role: USER_ROLES.TAILOR,             password: 'salim1234' },
          hanif:        { name: 'Hanif', role: USER_ROLES.TAILOR,             password: 'hanif1234' },
          shivmuhrat:   { name: 'Shiv Muhrat', role: USER_ROLES.TAILOR,       password: 'shivmuhrat1234' },
          lala:         { name: 'Lala', role: USER_ROLES.TAILOR,              password: 'lala1234' },
          mama:         { name: 'Mama', role: USER_ROLES.TAILOR,              password: 'mama1234' },
          mehboob:      { name: 'Mehboob', role: USER_ROLES.TAILOR,           password: 'mehboob1234' },
          shambhu:      { name: 'Shambhu', role: USER_ROLES.TAILOR,           password: 'shambhu1234' },
          abdulkadir:   { name: 'Abdul Kadir', role: USER_ROLES.IRONING_WORKER, password: 'abdulkadir1234' },
        };
        const entry = users[u2];
        if (!entry || String(password || '') !== entry.password) {
          toast.error(tGlobal('auth.invalid_login'));
          return false;
        }
        get().setCurrentUser(entry.name, entry.role);
        return true;
      },

      logout: async () => {
        try {
          const prevUser = get().currentUser;
          if (prevUser) {
            // Attempt to fetch current device token and unregister from previous user
            const { getFcmToken } = await import('../firebase');
            const token = await getFcmToken();
            if (token) {
              await get().unregisterFcmToken(prevUser, token);
            }
          }
        } catch (e) {
          // best-effort cleanup
        }
        set({ currentUser: null, currentUserRole: null });
        // Clear from localStorage
        try {
          localStorage.removeItem('stitchwell_user');
        } catch (_) {}
      },

      // Restore user session from localStorage
      restoreUserSession: () => {
        try {
          const stored = localStorage.getItem('stitchwell_user');
          if (stored) {
            const { user, role } = JSON.parse(stored);
            if (user && role) {
              set({ currentUser: user, currentUserRole: role });
              // Initialize backend sync and notifications
              get().initBackendSync();
              if (user) get()._subscribeNotifications(user);
              return true;
            }
          }
        } catch (_) {}
        return false;
      },

      // Workers state and management
      workers: initialWorkers,
      addWorker: async (role, name) => {
        if (!role || !name) return null;
        try {
          const db = await ensureDb();
          // Generate username/password
          const base = _baseUsername(name);
          const username = await _generateUniqueUsername(db, base);
          const password = _generatePassword(username);

          // Create user document (username as doc id)
          await setDoc(doc(db, 'users', username), {
            username,
            name,
            role,
            password,
            createdAt: serverTimestamp()
          }, { merge: true });

          // Also add to role list (for assignment defaults/UI)
          await setDoc(doc(db, 'workers', role), { list: arrayUnion(name), updatedAt: serverTimestamp() }, { merge: true });

          toast.success(tGlobal('store.added_to_role', { name, role }));
          return { username, password };
        } catch (e) {
          console.error('addWorker error', e);
          toast.error(tGlobal('store.failed_add_worker'));
          return null;
        }
      },
      removeWorker: async (role, name) => {
        try {
          const db = await ensureDb();
          await setDoc(doc(db, 'workers', role), { list: arrayRemove(name), updatedAt: serverTimestamp() }, { merge: true });
          toast.success(tGlobal('store.removed_from_role', { name, role }));
        } catch (e) {
          toast.error(tGlobal('store.failed_remove_worker'));
        }
      },
      // Make a worker the default for a role by moving them to the front of the list
      setDefaultWorker: async (role, name) => {
        try {
          const db = await ensureDb();
          const current = get().workers?.[role] || [];
          const next = [name, ...current.filter(n => n !== name)];
          await setDoc(doc(db, 'workers', role), { list: next, updatedAt: serverTimestamp() }, { merge: true });
          toast.success(tGlobal('store.default_set', { name, role }));
        } catch (e) {
          toast.error(tGlobal('store.failed_default'));
        }
      },

      // FCM token registry (client-side persisted)
      fcmTokens: persistedFcmTokens,
      registerFcmToken: async (userName, token) => {
        if (!userName || !token) return;
        set((state) => {
          const existing = state.fcmTokens[userName] || [];
          const next = existing.includes(token) ? existing : [...existing, token];
          const updated = { ...state.fcmTokens, [userName]: next };
          try { localStorage.setItem('fcmTokens', JSON.stringify(updated)); } catch (_) {}
          return { fcmTokens: updated };
        });
        try {
          const db = await ensureDb();
          await setDoc(doc(db, 'fcmTokens', userName), {
            tokens: arrayUnion(token),
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          // best-effort, backend will also attempt to store
        }
        console.log('FCM token registered successfully via Firestore:', { userName, tokenLength: token?.length });
      },

      unregisterFcmToken: async (userName, token) => {
        if (!userName || !token) return;
        // Update local cache
        set((state) => {
          const list = state.fcmTokens[userName] || [];
          const next = list.filter((t) => t !== token);
          const updated = { ...state.fcmTokens, [userName]: next };
          try { localStorage.setItem('fcmTokens', JSON.stringify(updated)); } catch (_) {}
          return { fcmTokens: updated };
        });
        // Update Firestore
        try {
          const db = await ensureDb();
          await setDoc(doc(db, 'fcmTokens', userName), {
            tokens: arrayRemove(token),
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          // best-effort
        }
        console.log('FCM token unregistered for user:', { userName, tokenSuffix: token?.slice?.(-8) });
      },

      // Create new cloth item (Admin only)
      // images: array of { fullUrl, thumbUrl, path?, thumbPath? }
      // For backward compatibility we also populate photoUrls
      createClothItem: async (type, billNumber, images = [], quantity = 1, customerName = null) => {
        try {
          const db = await ensureDb();
          const workers = get().workers;
          const cuttingAssignee = workers[USER_ROLES.CUTTING_WORKER]?.[0] || null;
          const imgs = Array.isArray(images) ? images.filter(Boolean) : [];
          const photoUrls = imgs.length > 0 ? imgs.map(i => i.fullUrl).filter(Boolean) : [];
          const payload = {
            type,
            billNumber,
            status: WORKFLOW_STATES.AWAITING_CUTTING,
            quantity: Number(quantity) || 1,
            customerName: customerName || null,
            assignedTo: cuttingAssignee,
            images: imgs,
            photoUrls,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            history: [
              {
                status: WORKFLOW_STATES.AWAITING_CUTTING,
                assignedTo: 'Admin',
                timestamp: new Date().toISOString(),
                action: tGlobal('history.actions.created_by_admin'),
                actionCode: 'created_by_admin',
                actionParams: { by: 'Admin' }
              },
              {
                status: WORKFLOW_STATES.AWAITING_CUTTING,
                assignedTo: cuttingAssignee,
                timestamp: new Date().toISOString(),
                action: tGlobal('history.actions.assigned_for_stage', { name: cuttingAssignee, stage: tGlobal('history.stage.cutting') }),
                actionCode: 'assigned_for_stage',
                actionParams: { name: cuttingAssignee, stage: 'cutting' }
              }
            ]
          };
          const ref = await addDoc(collection(db, 'clothItems'), payload);
          // Push notification via backend
          if (cuttingAssignee) {
            const typeLabel = translateClothType(String(type || '').charAt(0).toUpperCase() + String(type || '').slice(1).toLowerCase());
            const stage = 'cutting';
            const { title, body } = buildNotification({ kind: 'assign', stage, bill: billNumber, typeLabel, recipientRole: USER_ROLES.CUTTING_WORKER });
            get().addNotification(cuttingAssignee, body, title);
          }
          toast.success(tGlobal('store.created_ok', { type }));
          return { id: ref.id, ...payload };
        } catch (e) {
          toast.error(tGlobal('store.failed_create'));
        }
      },

      // Complete current task and move to next stage
      completeTask: async (itemId) => {
        const state = get();
        const item = state.clothItems.find(i => i.id === itemId);
        if (!item) { toast.error(tGlobal('store.item_not_found')); return; }

        const transition = computeNextTransition(item, state.workers);
        if (!transition) { toast.error(tGlobal('store.no_valid_transition')); return; }

        try {
          const db = await ensureDb();
          const prevStageKey = stageFromStatus(item.status) || '';
          const stageLabel = prevStageKey ? tGlobal(`history.stage.${prevStageKey}`) : item.status;
          const newHistory = [
            ...item.history,
            {
              status: transition.nextState,
              assignedTo: transition.assignedTo,
              timestamp: new Date().toISOString(),
              action: tGlobal('history.actions.completed_stage', { stage: stageLabel }),
              actionCode: 'completed_stage',
              actionParams: { stage: prevStageKey },
              actor: state.currentUser
            }
          ];
          const updateData = {
            status: transition.nextState,
            assignedTo: transition.assignedTo,
            updatedAt: serverTimestamp(),
            history: newHistory
          };

          // Add completion tracking when item reaches Ready status
          if (transition.nextState === WORKFLOW_STATES.READY) {
            const completionTimestamp = new Date();
            updateData.completedAt = completionTimestamp;
            updateData.completedBy = state.currentUser;
            updateData.completionMonth = completionTimestamp.getMonth() + 1; // 1-12
            updateData.completionYear = completionTimestamp.getFullYear();
            updateData.completionMonthYear = `${completionTimestamp.getFullYear()}-${String(completionTimestamp.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM format for easy querying
          }

          await updateDoc(doc(db, 'clothItems', itemId), updateData);
          if (transition.assignedTo) {
            const typeLabel = translateClothType(String(item.type || '').charAt(0).toUpperCase() + String(item.type || '').slice(1).toLowerCase());
            const nextStage = stageFromStatus(transition.nextState);
            const { title, body } = buildNotification({ kind: 'progress', stage: nextStage, bill: item.billNumber, typeLabel, recipientRole: roleFromStage(nextStage) });
            get().addNotification(transition.assignedTo, body, title);
          }
          toast.success(tGlobal('store.task_completed_moved', { status: translateStatus(transition.nextState) }));
        } catch (e) {
          toast.error(tGlobal('store.failed_update_task'));
        }
      },

      // Assign item to specific worker (Admin only)
      assignItemToWorker: async (itemId, workerName) => {
        const state = get();
        const item = state.clothItems.find(i => i.id === itemId);
        if (!item) { toast.error(tGlobal('store.item_not_found')); return; }
        try {
          const db = await ensureDb();
          const isTailorAssignment = item.status === WORKFLOW_STATES.AWAITING_TAILOR_ASSIGNMENT;
          const nextStatus = isTailorAssignment ? WORKFLOW_STATES.AWAITING_STITCHING : item.status;
          const stageKey = stageFromStatus(nextStatus) || '';
          const stageLabel2 = stageKey ? tGlobal(`history.stage.${stageKey}`) : '';
          const newHistory = [
            ...item.history,
            {
              status: nextStatus,
              assignedTo: workerName,
              timestamp: new Date().toISOString(),
              action: tGlobal('history.actions.assigned_for_stage', { name: workerName, stage: stageLabel2 || roleFromStage(stageKey) || '' }),
              actionCode: 'assigned_for_stage',
              actionParams: { name: workerName, stage: stageKey }
            }
          ];
          await updateDoc(doc(db, 'clothItems', itemId), {
            status: nextStatus,
            assignedTo: workerName,
            updatedAt: serverTimestamp(),
            history: newHistory
          });
          {
            const typeLabel = translateClothType(String(item.type || '').charAt(0).toUpperCase() + String(item.type || '').slice(1).toLowerCase());
            const stage = stageFromStatus(nextStatus);
            const { title, body } = buildNotification({ kind: 'assign', stage, bill: item.billNumber, typeLabel, recipientRole: roleFromStage(stage) });
            get().addNotification(workerName, body, title);
          }
          toast.success(`Item assigned to ${workerName}!`);
        } catch (e) {
          toast.error(tGlobal('store.failed_update_task'));
        }
      },

      // Send direct web push notification (for testing)
      sendWebPush: async (userName, title, body) => {
        const PUSH_ENDPOINT = getPushEndpoint();
        if (!PUSH_ENDPOINT) {
          console.error('Push endpoint not configured');
          return;
        }

        try {
          // Primary attempt: POST JSON
          let response = await fetch(PUSH_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userName,
              title: title || tGlobal('store.push_task'),
              body: body || tGlobal('store.push_update'),
              data: {
                url: '/',
                timestamp: new Date().toISOString()
              }
            })
          });

          if (!response.ok) {
            // Fallback: GET with query string for environments that reject JSON parsing (400 INVALID_ARGUMENT)
            const qs = new URLSearchParams({ userName, title: title || tGlobal('store.push_task'), body: body || tGlobal('store.push_update') });
            try {
              response = await fetch(`${PUSH_ENDPOINT}?${qs.toString()}`, { method: 'GET' });
            } catch (_) {}
          }

          if (response && response.ok) {
            const result = await response.json();
            console.log('Direct web push sent:', result);
            return result;
          } else {
            const errorText = response ? await response.text() : 'no response';
            console.error('Direct web push failed:', response?.status, errorText);
            throw new Error(`Push failed: ${response?.status}`);
          }
        } catch (error) {
          console.error('Direct web push error:', error);
          throw error;
        }
      },

      // Add notification for a specific user (also triggers FCM push)
      addNotification: async (userName, message, title) => {
        // Persist to Firestore first to get the real ID
        try {
          const db = await ensureDb();
          const docRef = await addDoc(collection(db, 'notifications'), {
            userName,
            message,
            timestamp: serverTimestamp(),
            read: false
          });

          // Add to local state with the real Firestore ID
          const notif = {
            id: docRef.id,
            userName,
            message,
            timestamp: new Date().toISOString(),
            read: false
          };
          set(state => ({ notifications: [notif, ...state.notifications] }));
        } catch (e) {
          console.error('Failed to add notification:', e);
          // Fallback: add to local state with temp ID
          const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const notif = {
            id: tempId,
            userName,
            message,
            timestamp: new Date().toISOString(),
            read: false
          };
          set(state => ({ notifications: [notif, ...state.notifications] }));
        }

        // Push is now handled by Cloud Functions Firestore trigger on clothItems changes

        // Send actual web push notification via Cloud Function (server looks up tokens from Firestore)
        try {
          const PUSH_ENDPOINT = getPushEndpoint();
          if (!PUSH_ENDPOINT) {
            console.error('Push endpoint not configured');
            return;
          }

          let response = await fetch(PUSH_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userName,
              title: title || message || tGlobal('store.push_task'),
              body: message || tGlobal('store.push_update'),
              data: {
                url: '/',
                timestamp: new Date().toISOString()
              }
            })
          });
          console.log('Push response:', response);

          if (!response.ok) {
            const qs = new URLSearchParams({ userName, title: title || message || tGlobal('store.push_task'), body: message || tGlobal('store.push_update') });
            try {
              response = await fetch(`${PUSH_ENDPOINT}?${qs.toString()}`, { method: 'GET' });
            } catch (_) {}
          }

          if (response && response.ok) {
            const result = await response.json();
            console.log('Web push notification sent successfully:', result);
          } else {
            let errorText = '';
            try { errorText = await (response ? response.text() : Promise.resolve('no response')); } catch (_) {}
            console.error('Push notification failed:', response?.status, errorText || response?.statusText);
          }
        } catch (e) {
          console.warn('Web push notification failed:', e);
        }
      },

      // Mark notification as read (best-effort Firestore update)
      markNotificationAsRead: async (notificationId) => {
        if (!notificationId) return;

        // Local optimistic update
        set(state => ({
          notifications: state.notifications.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        }));

        // Update Firestore if it's not a temporary ID
        if (!notificationId.startsWith('temp_')) {
          try {
            const db = await ensureDb();
            await updateDoc(doc(db, 'notifications', notificationId), { read: true });
          } catch (e) {
            console.error('Failed to update notification in Firestore:', e);
          }
        }
      },

      // Mark all my notifications as read (batch, latest loaded)
      markAllMyNotificationsAsRead: async () => {
        const state = get();
        const me = state.currentUser;
        if (!me) return;

        const myUnreadNotifications = (state.notifications || [])
          .filter(n => n.userName === me && !n.read && n.id);

        if (myUnreadNotifications.length === 0) return;

        const allIds = myUnreadNotifications.map(n => n.id);
        const firestoreIds = myUnreadNotifications
          .filter(n => !n.id.startsWith('temp_'))
          .map(n => n.id);

        // Local optimistic update for all notifications
        set(state => ({
          notifications: state.notifications.map(n =>
            allIds.includes(n.id) ? { ...n, read: true } : n
          )
        }));

        // Firestore batch update for real documents
        if (firestoreIds.length > 0) {
          try {
            const db = await ensureDb();
            const batch = writeBatch(db);
            firestoreIds.forEach(id => {
              batch.update(doc(db, 'notifications', id), { read: true });
            });
            await batch.commit();
          } catch (e) {
            console.error('Failed to batch update notifications in Firestore:', e);
          }
        }
      },


      // Get items assigned to current user
      getMyTasks: () => {
        const state = get();
        if (!state.currentUser) return [];

        return state.clothItems.filter(item =>
          item.assignedTo === state.currentUser
        );
      },

      // Get notifications for current user
      getMyNotifications: () => {
        const state = get();
        if (!state.currentUser) return [];

        return state.notifications.filter(notification =>
          notification.userName === state.currentUser
        ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      },

      // Initialize realtime sync for clothItems and workers
      initBackendSync: async () => {
        try {
          const db = await ensureDb();
          // cloth items
          if (_unsubCloth) _unsubCloth();
          const qItems = query(collection(db, 'clothItems'), orderBy('createdAt', 'desc'));
          _unsubCloth = onSnapshot(qItems, (snap) => {
            const arr = snap.docs.map(d => {
              const data = d.data();
              const history = Array.isArray(data.history) ? data.history.map(h => ({
                ...h,
                timestamp: toISO(h.timestamp) || h.timestamp || null
              })) : [];
              const createdAt = toISO(data.createdAt);
              const updatedAt = toISO(data.updatedAt);
              const completedAt = toISO(data.completedAt);
              // Backfill month/year keys if missing for older data
              let completionMonthYear = data.completionMonthYear;
              let completionMonth = data.completionMonth;
              let completionYear = data.completionYear;
              if (!completionMonthYear && completedAt) {
                const dte = new Date(completedAt);
                const m = String(dte.getMonth() + 1).padStart(2, '0');
                const y = dte.getFullYear();
                completionMonthYear = `${y}-${m}`;
                completionMonth = Number(m);
                completionYear = y;
              }
              return {
                id: d.id,
                ...data,
                createdAt,
                updatedAt,
                completedAt,
                completionMonthYear,
                completionMonth,
                completionYear,
                history
              };
            });
            set({ clothItems: arr });
          });
          // workers (each doc id == role, field list: [...names])
          if (_unsubWorkers) _unsubWorkers();
          _unsubWorkers = onSnapshot(collection(db, 'workers'), async (snap) => {
            // Seed defaults on first run when collection is empty
            if (snap.empty) {
              try { await seedWorkersIfEmpty(db); } catch (_) {}
              return; // next snapshot will populate
            }
            const map = {};
            snap.docs.forEach(docSnap => { map[docSnap.id] = docSnap.data()?.list || []; });
            set({ workers: map });
            // Ensure any unassigned threading items are assigned
            try { await fixUnassignedItems(db, map); } catch (_) {}
          });
        } catch (e) {
          // no-op
        }
      },

      // Subscribe notifications for a specific user
      _subscribeNotifications: async (userName) => {
        try {
          const db = await ensureDb();
          if (_unsubNotifs) _unsubNotifs();
          const q = query(
            collection(db, 'notifications'),
            where('userName', '==', userName),
            orderBy('timestamp', 'desc'),
            limit(50)
          );
          _unsubNotifs = onSnapshot(q, (snap) => {
            const firestoreNotifications = snap.docs.map(d => {
              const data = d.data();
              return {
                id: d.id,
                ...data,
                timestamp: toISO(data.timestamp) || data.timestamp || null
              };
            });

            // Merge with local state to preserve optimistic "read" flags until server confirms
            set((state) => {
              const prevById = {};
              (state.notifications || []).forEach((n) => { if (n && n.id) prevById[n.id] = n; });
              const merged = firestoreNotifications.map((n) => {
                const prev = prevById[n.id];
                if (prev && prev.read === true && (n.read === false || typeof n.read === 'undefined')) {
                  return { ...n, read: true };
                }
                return n;
              });
              return { notifications: merged };
            });
          });
        } catch (e) {
          console.error('Error subscribing to notifications:', e);
        }
      },

      // Delete a single image from an item (Admin only)
      deleteItemImage: async (itemId, image) => {
        try {
          const state = get();
          if (state.currentUserRole !== USER_ROLES.ADMIN) {
            toast.error(tGlobal('store.only_admin_delete'));
            return false;
          }
          if (!itemId || !image) return false;
          const db = await ensureDb();
          const itemRef = doc(db, 'clothItems', itemId);
          const snap = await getDoc(itemRef);
          if (!snap.exists()) {
            toast.error(tGlobal('store.item_not_found'));
            return false;
          }
          const data = snap.data() || {};
          const images = Array.isArray(data.images) ? data.images : [];
          const photoUrls = Array.isArray(data.photoUrls) ? data.photoUrls : [];

          // Remove from storage if we can
          try {
            const { getStorage, ref, deleteObject } = await import('firebase/storage');
            const storage = getStorage();
            const paths = [];
            if (image?.path) paths.push(image.path);
            if (image?.thumbPath) paths.push(image.thumbPath);
            // If image came from legacy URL only, try to delete via URL
            if (!paths.length && image?.fullUrl) paths.push(image.fullUrl);
            for (const p of paths) {
              try { await deleteObject(ref(storage, p)); } catch (_) {}
            }
          } catch (_) {}

          // Update Firestore arrays
          const nextImages = images.filter((im) => (im?.fullUrl || '') !== (image?.fullUrl || ''));
          const nextUrls = photoUrls.filter((u) => u !== (image?.fullUrl || image));
          await updateDoc(itemRef, { images: nextImages, photoUrls: nextUrls, updatedAt: serverTimestamp() });
          return true;
        } catch (e) {
          console.error('deleteItemImage error', e);
          toast.error(tGlobal('store.failed_delete'));
          return false;
        }
      },

      // Delete cloth item (Admin only)
      deleteClothItem: async (itemId) => {
        const state = get();
        const item = state.clothItems.find(i => i.id === itemId);
        if (!item) {
          toast.error(tGlobal('store.item_not_found'));
          return false;
        }

        // Check if user is admin
        if (state.currentUserRole !== USER_ROLES.ADMIN) {
          toast.error(tGlobal('store.only_admin_delete'));
          return false;
        }

        try {
          const db = await ensureDb();
          await deleteDoc(doc(db, 'clothItems', itemId));
          toast.success(tGlobal('store.deleted_ok', { bill: item.billNumber }));
          return true;
        } catch (e) {
          console.error('Delete error:', e);
          toast.error(tGlobal('store.failed_delete'));
          return false;
        }
      },

      // Get all items (Admin view)
      getAllItems: () => {
        return get().clothItems;
      },

      // Analytics functions for monthly completion data
      getMonthlyCompletions: (year, month) => {
        const state = get();
        const monthYear = `${year}-${String(month).padStart(2, '0')}`;
        return (state.clothItems || []).filter(item =>
          item.status === WORKFLOW_STATES.READY &&
          item.completionMonthYear === monthYear
        );
      },

      getWorkerMonthlyStats: (year, month) => {
        const state = get();
        const monthYear = `${year}-${String(month).padStart(2, '0')}`;
        const allItems = state.clothItems || [];

        // Get all items assigned in this month (for assignment count)
        const assignedItems = allItems.filter(item => {
          if (!item.createdAt) return false;
          const createdDate = typeof item.createdAt?.toDate === 'function' ? item.createdAt.toDate() : new Date(item.createdAt);
          const itemMonthYear = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
          return itemMonthYear === monthYear;
        });

        // Get completed items for this month
        const completedItems = allItems.filter(item =>
          item.status === WORKFLOW_STATES.READY &&
          item.completionMonthYear === monthYear
        );

        // Group by worker
        const workerStats = {};
        const workers = state.workers || {};

        // Initialize stats for all workers
        Object.values(workers).flat().forEach(workerName => {
          workerStats[workerName] = {
            name: workerName,
            assigned: 0,
            completed: 0,
            completionRate: 0,
            completedItems: [],
            itemTypeBreakdown: {}
          };
        });

        // Count assigned items
        assignedItems.forEach(item => {
          if (item.assignedTo && workerStats[item.assignedTo]) {
            workerStats[item.assignedTo].assigned++;
          }
        });

        // Count completed items and build detailed breakdown
        completedItems.forEach(item => {
          if (item.completedBy && workerStats[item.completedBy]) {
            const worker = workerStats[item.completedBy];
            worker.completed++;
            worker.completedItems.push({
              id: item.id,
              billNumber: item.billNumber,
              type: item.type,
              quantity: item.quantity || 1,
              completedAt: item.completedAt,
              customerName: item.customerName
            });

            // Item type breakdown
            const type = item.type || 'Unknown';
            const quantity = item.quantity || 1;
            worker.itemTypeBreakdown[type] = (worker.itemTypeBreakdown[type] || 0) + quantity;
          }
        });

        // Calculate completion rates
        Object.values(workerStats).forEach(worker => {
          if (worker.assigned > 0) {
            worker.completionRate = Math.round((worker.completed / worker.assigned) * 100);
          }
        });

        return workerStats;
      },

      getMonthlyItemTypeBreakdown: (year, month) => {
        const state = get();
        const completions = state.getMonthlyCompletions(year, month);
        const breakdown = {};

        completions.forEach(item => {
          const type = item.type || 'Unknown';
          const quantity = item.quantity || 1;
          breakdown[type] = (breakdown[type] || 0) + quantity;
        });

        return breakdown;
      },


      // Admin: Stage-level completions per worker for selected month (immediate credit)
      getWorkerStageMonthlyStats: (year, month) => {
        const state = get();
        const monthYear = `${year}-${String(month).padStart(2, '0')}`;
        const allItems = state.clothItems || [];

        const stats = {};
        const workers = state.workers || {};

        // Initialize from known workers
        Object.values(workers).flat().forEach((name) => {
          stats[name] = { name, stageCompleted: 0, stages: {}, completedStages: [] };
        });

        allItems.forEach((item) => {
          const history = Array.isArray(item.history) ? item.history : [];
          history.forEach((entry) => {
            if (entry?.actionCode !== 'completed_stage' || !entry?.actor || !entry?.timestamp) return;
            const d = typeof entry.timestamp?.toDate === 'function' ? entry.timestamp.toDate() : new Date(entry.timestamp);
            const entryMonthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (entryMonthYear !== monthYear) return;

            const workerName = entry.actor;
            if (!stats[workerName]) stats[workerName] = { name: workerName, stageCompleted: 0, stages: {}, completedStages: [] };
            stats[workerName].stageCompleted += 1;
            const stageKey = entry?.actionParams?.stage || 'unknown';
            stats[workerName].stages[stageKey] = (stats[workerName].stages[stageKey] || 0) + 1;
            stats[workerName].completedStages.push({
              id: item.id,
              billNumber: item.billNumber,
              type: item.type,
              quantity: item.quantity || 1,
              stage: stageKey,
              timestamp: entry.timestamp,
              customerName: item.customerName
            });
          });
        });

        return stats;
      },

      getWorkerPersonalStats: (workerName, year, month) => {
        const state = get();
        const monthYear = `${year}-${String(month).padStart(2, '0')}`;
        const allItems = state.clothItems || [];

        // Get items assigned to this worker in the month
        const assignedItems = allItems.filter(item => {
          if (item.assignedTo !== workerName) return false;
          if (!item.createdAt) return false;
          const createdDate = typeof item.createdAt?.toDate === 'function' ? item.createdAt.toDate() : new Date(item.createdAt);
          const itemMonthYear = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
          return itemMonthYear === monthYear;
        });

        // Stage completions for this worker in the month (immediate credit)
        const stageCompletions = [];
        allItems.forEach(item => {
          const history = Array.isArray(item.history) ? item.history : [];
          history.forEach(entry => {
            if (entry?.actionCode === 'completed_stage' && entry?.actor === workerName && entry?.timestamp) {
              const d = typeof entry.timestamp?.toDate === 'function' ? entry.timestamp.toDate() : new Date(entry.timestamp);
              const entryMonthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              if (entryMonthYear === monthYear) {
                stageCompletions.push({ item, entry, when: d });
              }
            }
          });
        });

        const completedItems = stageCompletions.map(({ item, entry }) => ({
          id: item.id,
          billNumber: item.billNumber,
          type: item.type,
          quantity: item.quantity || 1,
          completedAt: entry.timestamp,
          customerName: item.customerName,
          createdAt: item.createdAt
        }));

        const itemTypeBreakdown = {};
        completedItems.forEach(ci => {
          const type = ci.type || 'Unknown';
          const quantity = ci.quantity || 1;
          itemTypeBreakdown[type] = (itemTypeBreakdown[type] || 0) + quantity;
        });

        const completionTimes = [];
        stageCompletions.forEach(({ item, entry }) => {
          if (item.createdAt && entry.timestamp) {
            const created = typeof item.createdAt?.toDate === 'function' ? item.createdAt.toDate() : new Date(item.createdAt);
            const completed = typeof entry.timestamp?.toDate === 'function' ? entry.timestamp.toDate() : new Date(entry.timestamp);
            const timeDiff = completed.getTime() - created.getTime();
            if (!isNaN(timeDiff)) completionTimes.push(timeDiff);
          }
        });

        const avgCompletionTime = completionTimes.length > 0
          ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
          : 0;

        return {
          assigned: assignedItems.length,
          completed: completedItems.length,
          completionRate: assignedItems.length > 0 ? Math.round((completedItems.length / assignedItems.length) * 100) : 0,
          completedItems,
          itemTypeBreakdown,
          avgCompletionTimeMs: avgCompletionTime
        };
      }
    }),
    {
      name: 'tailoring-workflow-store'
    }
  )
);

export default useStore;

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import toast from 'react-hot-toast';
import { getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, where, serverTimestamp, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import { initFirebase } from '../firebase';

// Compute push endpoint dynamically. Prefer VITE_PUSH_ENDPOINT, else derive from REGISTER_TOKEN_ENDPOINT by swapping the path to sendTestNotification.
function getPushEndpoint() {
  const direct = import.meta.env.VITE_PUSH_ENDPOINT;
  if (direct) return direct;
  const reg = import.meta.env.VITE_REGISTER_TOKEN_ENDPOINT || '';
  try {
    if (!reg) return '';
    const u = new URL(reg);
    // Replace the last path segment with the push function name
    const parts = u.pathname.split('/');
    parts[parts.length - 1] = 'sendTestNotification';
    u.pathname = parts.join('/');
    return u.toString();
  } catch (_) {
    return '';
  }
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
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

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

      // Simple credential-based login (username: lowercase worker name w/o spaces)
      loginWithCredentials: (username, password) => {
        const u = String(username || '').toLowerCase().replace(/\s+/g, '');
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
        const entry = users[u];
        if (!entry) {
          toast.error('Invalid username or password');
          return false;
        }
        if (String(password || '') !== entry.password) {
          toast.error('Invalid username or password');
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
        if (!role || !name) return;
        try {
          const db = await ensureDb();
          await setDoc(doc(db, 'workers', role), { list: arrayUnion(name), updatedAt: serverTimestamp() }, { merge: true });
          toast.success(`Added ${name} to ${role}`);
        } catch (e) {
          toast.error('Failed to add worker');
        }
      },
      removeWorker: async (role, name) => {
        try {
          const db = await ensureDb();
          await setDoc(doc(db, 'workers', role), { list: arrayRemove(name), updatedAt: serverTimestamp() }, { merge: true });
          toast.success(`Removed ${name} from ${role}`);
        } catch (e) {
          toast.error('Failed to remove worker');
        }
      },
      // Make a worker the default for a role by moving them to the front of the list
      setDefaultWorker: async (role, name) => {
        try {
          const db = await ensureDb();
          const current = get().workers?.[role] || [];
          const next = [name, ...current.filter(n => n !== name)];
          await setDoc(doc(db, 'workers', role), { list: next, updatedAt: serverTimestamp() }, { merge: true });
          toast.success(`${name} is now default for ${role}`);
        } catch (e) {
          toast.error('Failed to set default worker');
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
      createClothItem: async (type, billNumber) => {
        try {
          const db = await ensureDb();
          const workers = get().workers;
          const cuttingAssignee = workers[USER_ROLES.CUTTING_WORKER]?.[0] || null;
          const payload = {
            type,
            billNumber,
            status: WORKFLOW_STATES.AWAITING_CUTTING,
            assignedTo: cuttingAssignee,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            history: [{
              status: WORKFLOW_STATES.AWAITING_CUTTING,
              assignedTo: cuttingAssignee,
              timestamp: new Date().toISOString(),
              action: 'Item created'
            }]
          };
          const ref = await addDoc(collection(db, 'clothItems'), payload);
          // Push notification via backend
          if (cuttingAssignee) {
            get().addNotification(
              cuttingAssignee,
              `New ${type} item (${billNumber}) has been assigned to you for cutting.`
            );
          }
          toast.success(`${type} item created successfully!`);
          return { id: ref.id, ...payload };
        } catch (e) {
          toast.error('Failed to create item');
        }
      },

      // Complete current task and move to next stage
      completeTask: async (itemId) => {
        const state = get();
        const item = state.clothItems.find(i => i.id === itemId);
        if (!item) { toast.error('Item not found!'); return; }

        const transition = computeNextTransition(item, state.workers);
        if (!transition) { toast.error('No valid transition available!'); return; }

        try {
          const db = await ensureDb();
          const newHistory = [
            ...item.history,
            { status: transition.nextState, assignedTo: transition.assignedTo, timestamp: new Date().toISOString(), action: `Completed ${item.status}` }
          ];
          await updateDoc(doc(db, 'clothItems', itemId), {
            status: transition.nextState,
            assignedTo: transition.assignedTo,
            updatedAt: serverTimestamp(),
            history: newHistory
          });
          if (transition.assignedTo) {
            get().addNotification(
              transition.assignedTo,
              `Item ${item.billNumber} (${item.type}) has been assigned to you for ${transition.nextState.toLowerCase()}.`
            );
          }
          toast.success(`Task completed! Item moved to ${transition.nextState}`);
        } catch (e) {
          toast.error('Failed to update task');
        }
      },

      // Assign item to specific worker (Admin only)
      assignItemToWorker: async (itemId, workerName) => {
        const state = get();
        const item = state.clothItems.find(i => i.id === itemId);
        if (!item) { toast.error('Item not found!'); return; }
        try {
          const db = await ensureDb();
          const isTailorAssignment = item.status === WORKFLOW_STATES.AWAITING_TAILOR_ASSIGNMENT;
          const nextStatus = isTailorAssignment ? WORKFLOW_STATES.AWAITING_STITCHING : item.status;
          const newHistory = [
            ...item.history,
            { status: nextStatus, assignedTo: workerName, timestamp: new Date().toISOString(), action: `Assigned to ${workerName}` }
          ];
          await updateDoc(doc(db, 'clothItems', itemId), {
            status: nextStatus,
            assignedTo: workerName,
            updatedAt: serverTimestamp(),
            history: newHistory
          });
          get().addNotification(
            workerName,
            `Item ${item.billNumber} (${item.type}) has been assigned to you for ${nextStatus.toLowerCase()}.`
          );
          toast.success(`Item assigned to ${workerName}!`);
        } catch (e) {
          toast.error('Failed to assign item');
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
              title: title || 'StitchWell Notification',
              body: body || 'You have a new update',
              data: {
                url: '/',
                timestamp: new Date().toISOString()
              }
            })
          });

          if (!response.ok) {
            // Fallback: GET with query string for environments that reject JSON parsing (400 INVALID_ARGUMENT)
            const qs = new URLSearchParams({ userName, title: title || 'StitchWell Notification', body: body || 'You have a new update' });
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
      addNotification: async (userName, message) => {
        const notif = { userName, message, timestamp: new Date().toISOString(), read: false };
        set(state => ({ notifications: [notif, ...state.notifications] }));

        // Persist to Firestore
        try {
          const db = await ensureDb();
          await addDoc(collection(db, 'notifications'), {
            userName,
            message,
            timestamp: serverTimestamp(),
            read: false
          });
        } catch (_) {}

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
              title: 'StitchWell - New Task',
              body: message,
              data: {
                url: '/',
                timestamp: new Date().toISOString()
              }
            })
          });

          if (!response.ok) {
            const qs = new URLSearchParams({ userName, title: 'StitchWell - New Task', body: message });
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
        set(state => ({
          notifications: state.notifications.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        }));
        try {
          const db = await ensureDb();
          await updateDoc(doc(db, 'notifications', notificationId), { read: true });
        } catch (_) {}
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
              return {
                id: d.id,
                ...data,
                createdAt: toISO(data.createdAt),
                updatedAt: toISO(data.updatedAt),
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
          const q = query(collection(db, 'notifications'), where('userName', '==', userName), orderBy('timestamp', 'desc'));
          _unsubNotifs = onSnapshot(q, (snap) => {
            const arr = snap.docs.map(d => {
              const data = d.data();
              return {
                id: d.id,
                ...data,
                timestamp: toISO(data.timestamp) || data.timestamp || null
              };
            });
            set({ notifications: arr });
          });
        } catch (e) {
          // no-op
        }
      },

      // Delete cloth item (Admin only)
      deleteClothItem: async (itemId) => {
        const state = get();
        const item = state.clothItems.find(i => i.id === itemId);
        if (!item) {
          toast.error('Item not found!');
          return false;
        }

        // Check if user is admin
        if (state.currentUserRole !== USER_ROLES.ADMIN) {
          toast.error('Only admin users can delete items!');
          return false;
        }

        try {
          const db = await ensureDb();
          await deleteDoc(doc(db, 'clothItems', itemId));
          toast.success(`Item ${item.billNumber} deleted successfully!`);
          return true;
        } catch (e) {
          console.error('Delete error:', e);
          toast.error('Failed to delete item');
          return false;
        }
      },

      // Get all items (Admin view)
      getAllItems: () => {
        return get().clothItems;
      }
    }),
    {
      name: 'tailoring-workflow-store'
    }
  )
);

export default useStore;

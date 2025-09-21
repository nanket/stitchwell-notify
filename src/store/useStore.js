import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import toast from 'react-hot-toast';
import { getFirestore, collection, doc, addDoc, setDoc, updateDoc, onSnapshot, query, orderBy, where, serverTimestamp, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import { initFirebase } from '../firebase';

const PUSH_ENDPOINT = import.meta.env.VITE_PUSH_ENDPOINT || '';
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
  // Auto-assign unassigned threading items to default threading worker
  const threadingAssignee = workersMap[USER_ROLES.THREADING_WORKER]?.[0];
  if (!threadingAssignee) return;
  try {
    const q = query(
      collection(db, 'clothItems'),
      where('status', '==', WORKFLOW_STATES.AWAITING_THREADING),
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
export const WORKFLOW_STATES = {
  AWAITING_THREADING: 'Awaiting Threading',
  AWAITING_CUTTING: 'Awaiting Cutting',
  AWAITING_STITCHING_ASSIGNMENT: 'Awaiting Stitching Assignment',
  AWAITING_STITCHING: 'Awaiting Stitching',
  AWAITING_BUTTONING: 'Awaiting Buttoning',
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

// Predefined workers for each role
const initialWorkers = {
  [USER_ROLES.ADMIN]: ['Admin'],
  [USER_ROLES.THREADING_WORKER]: ['Abdul'],
  [USER_ROLES.CUTTING_WORKER]: ['Feroz'],
  [USER_ROLES.TAILOR]: ['Tailor 1', 'Tailor 2', 'Tailor 3', 'Tailor 4'],
  [USER_ROLES.BUTTONING_WORKER]: ['Abdul'],
  [USER_ROLES.IRONING_WORKER]: ['Dinesh'],
  [USER_ROLES.PACKAGING_WORKER]: ['Dinesh']
};

// Define cloth types
export const CLOTH_TYPES = ['Shirt', 'Pant', 'Kurta'];

// Compute next transition dynamically using current workers
const computeNextTransition = (status, workers) => {
  switch (status) {
    case WORKFLOW_STATES.AWAITING_THREADING:
      return { nextState: WORKFLOW_STATES.AWAITING_CUTTING, assignedTo: workers[USER_ROLES.CUTTING_WORKER]?.[0] || null };
    case WORKFLOW_STATES.AWAITING_CUTTING:
      return { nextState: WORKFLOW_STATES.AWAITING_STITCHING_ASSIGNMENT, assignedTo: workers[USER_ROLES.ADMIN]?.[0] || null };
    case WORKFLOW_STATES.AWAITING_STITCHING_ASSIGNMENT:
      return { nextState: WORKFLOW_STATES.AWAITING_STITCHING, assignedTo: null }; // tailor already chosen by admin
    case WORKFLOW_STATES.AWAITING_STITCHING:
      return { nextState: WORKFLOW_STATES.AWAITING_BUTTONING, assignedTo: workers[USER_ROLES.BUTTONING_WORKER]?.[0] || null };
    case WORKFLOW_STATES.AWAITING_BUTTONING:
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
        // subscribe notifications for this user and ensure backend listeners
        try {
          get().initBackendSync();
          if (user) get()._subscribeNotifications(user);
        } catch (_) {}
      },

      logout: () => {
        set({ currentUser: null, currentUserRole: null });
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
        // Write to Firestore as the source of truth (ensures fcmTokens collection exists)
        try {
          const db = await ensureDb();
          await setDoc(doc(db, 'fcmTokens', userName), {
            tokens: arrayUnion(token),
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          // best-effort, backend will also attempt to store
        }
        // Skip problematic Cloud Function for now - Firestore direct write above is sufficient
        console.log('FCM token registered successfully via Firestore:', { userName, tokenLength: token?.length });
      },

      // Create new cloth item (Admin only)
      createClothItem: async (type, billNumber) => {
        try {
          const db = await ensureDb();
          const workers = get().workers;
          const threadingAssignee = workers[USER_ROLES.THREADING_WORKER]?.[0] || null;
          const payload = {
            type,
            billNumber,
            status: WORKFLOW_STATES.AWAITING_THREADING,
            assignedTo: threadingAssignee,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            history: [{
              status: WORKFLOW_STATES.AWAITING_THREADING,
              assignedTo: threadingAssignee,
              timestamp: new Date().toISOString(),
              action: 'Item created'
            }]
          };
          const ref = await addDoc(collection(db, 'clothItems'), payload);
          // Push notification via backend
          if (threadingAssignee) {
            get().addNotification(
              threadingAssignee,
              `New ${type} item (${billNumber}) has been assigned to you for threading.`
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

        const transition = computeNextTransition(item.status, state.workers);
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
          const newHistory = [
            ...item.history,
            { status: item.status, assignedTo: workerName, timestamp: new Date().toISOString(), action: `Assigned to ${workerName}` }
          ];
          await updateDoc(doc(db, 'clothItems', itemId), {
            assignedTo: workerName,
            updatedAt: serverTimestamp(),
            history: newHistory
          });
          get().addNotification(
            workerName,
            `Item ${item.billNumber} (${item.type}) has been assigned to you for ${item.status.toLowerCase()}.`
          );
          toast.success(`Item assigned to ${workerName}!`);
        } catch (e) {
          toast.error('Failed to assign item');
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

        // Enhanced local web notification for all users
        try {
          if ('Notification' in window && Notification.permission === 'granted') {
            // Always show notification for task assignments
            if (navigator.serviceWorker?.ready) {
              navigator.serviceWorker.ready.then((reg) => {
                reg.showNotification('StitchWell - New Task', {
                  body: message,
                  icon: '/vite.svg',
                  badge: '/vite.svg',
                  tag: 'stitchwell-task-' + Date.now(),
                  requireInteraction: true,
                  actions: [
                    { action: 'view', title: 'View Task' }
                  ]
                });
              });
            } else {
              new Notification('StitchWell - New Task', {
                body: message,
                icon: '/vite.svg',
                tag: 'stitchwell-task'
              });
            }
            console.log('Local notification sent:', { userName, message });
          }
        } catch (e) {
          console.warn('Local notification failed:', e);
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

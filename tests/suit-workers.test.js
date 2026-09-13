import { beforeEach, describe, expect, it, vi } from 'vitest';

const backend = vi.hoisted(() => ({ data: undefined, fail: false, writes: [], listeners: {} }));
vi.mock('../src/firebase', () => ({ initFirebase: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('firebase/firestore', async importOriginal => ({
  ...await importOriginal(),
  getFirestore: () => ({}),
  doc: (_db, collection, id) => `${collection}/${id}`,
  collection: (_db, name) => name,
  query: ref => ref,
  onSnapshot: (ref, callback) => { backend.listeners[ref] = callback; return () => {}; },
  getDocs: async () => ({ empty: false, docs: [], forEach: () => {} }),
  serverTimestamp: () => 'server-time',
  runTransaction: async (_db, callback) => {
    if (backend.fail) throw new Error('permission-denied');
    return callback({
      get: async () => ({ data: () => backend.data }),
      set: (ref, data) => { backend.writes.push({ ref, data }); backend.data = data; },
    });
  },
}));
import useStore from '../src/store/useStore';

const defaults = ['Abdullah Master', 'Aman', 'Rafiqu'];
beforeEach(() => {
  backend.data = undefined;
  backend.fail = false;
  backend.writes = [];
  backend.listeners = {};
  useStore.setState({ suitWorkers: [...defaults], workers: {}, suitAssignments: [] });
});

describe('suit worker roster', () => {
  it('preserves existing workers and persists a trimmed new name', async () => {
    expect(await useStore.getState().addSuitWorker('  New   Master  ')).toBe('New Master');
    expect(backend.writes[0]).toEqual({ ref: 'workers/_suitWorkers', data: { list: [...defaults, 'New Master'], updatedAt: 'server-time' } });
    expect(useStore.getState().suitWorkers).toEqual([...defaults, 'New Master']);
  });
  it('rejects duplicates regardless of case or extra spaces', async () => {
    expect(await useStore.getState().addSuitWorker(' ABDULLAH   master ')).toBeNull();
    expect(backend.writes).toHaveLength(0);
  });
  it('reads the latest server list rather than overwriting workers from another device', async () => {
    backend.data = { list: [...defaults, 'Other Master'] };
    await useStore.getState().addSuitWorker('New Master');
    expect(backend.data.list).toEqual([...defaults, 'Other Master', 'New Master']);
  });
  it('does not add a worker locally when persistence fails', async () => {
    backend.fail = true;
    expect(await useStore.getState().addSuitWorker('New Master')).toBeNull();
    expect(useStore.getState().suitWorkers).toEqual(defaults);
    expect(backend.writes).toHaveLength(0);
  });
  it('rejects blank and overlong names without writing', async () => {
    expect(await useStore.getState().addSuitWorker('   ')).toBeNull();
    expect(await useStore.getState().addSuitWorker('a'.repeat(81))).toBeNull();
    expect(backend.writes).toHaveLength(0);
  });
  it('loads saved suit workers separately from normal worker roles on sync', async () => {
    await useStore.getState().initBackendSync();
    await backend.listeners.workers({ docs: [
      { id: '_suitWorkers', data: () => ({ list: [...defaults, 'Saved Master'] }) },
      { id: 'Tailor', data: () => ({ list: ['Existing Tailor'] }) },
    ] });
    expect(useStore.getState().suitWorkers).toEqual([...defaults, 'Saved Master']);
    expect(useStore.getState().workers).toEqual({ Tailor: ['Existing Tailor'] });
  });
});

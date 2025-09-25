import { WORKFLOW_STATES } from '../store/useStore';

// Demo data for testing the application
export const DEMO_ITEMS = [
  {
    id: 'demo-1',
    type: 'Shirt',
    billNumber: 'SH001',
    status: WORKFLOW_STATES.AWAITING_CUTTING,
    assignedTo: 'Feroz',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    history: [
      {
        status: WORKFLOW_STATES.AWAITING_CUTTING,
        assignedTo: 'Admin',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        action: 'Item created by Admin'
      },
      {
        status: WORKFLOW_STATES.AWAITING_CUTTING,
        assignedTo: 'Feroz',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        action: 'Assigned to Feroz for cutting'
      }
    ]
  },
  {
    id: 'demo-2',
    type: 'Pant',
    billNumber: 'PT002',
    status: WORKFLOW_STATES.AWAITING_CUTTING,
    assignedTo: 'Feroz',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    history: [
      {
        status: WORKFLOW_STATES.AWAITING_CUTTING,
        assignedTo: 'Admin',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        action: 'Item created by Admin'
      },
      {
        status: WORKFLOW_STATES.AWAITING_CUTTING,
        assignedTo: 'Feroz',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        action: 'Assigned to Feroz for cutting'
      }
    ]
  },
  {
    id: 'demo-3',
    type: 'Kurta',
    billNumber: 'KT003',
    status: WORKFLOW_STATES.AWAITING_TAILOR_ASSIGNMENT,
    assignedTo: 'Gaju',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    history: [
      {
        status: WORKFLOW_STATES.AWAITING_CUTTING,
        assignedTo: 'Admin',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        action: 'Item created by Admin'
      },
      {
        status: WORKFLOW_STATES.AWAITING_CUTTING,
        assignedTo: 'Feroz',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        action: 'Assigned to Feroz for cutting'
      },
      {
        status: WORKFLOW_STATES.AWAITING_THREAD_MATCHING,
        assignedTo: 'Abdul',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        action: 'Cutting completed'
      },
      {
        status: WORKFLOW_STATES.AWAITING_TAILOR_ASSIGNMENT,
        assignedTo: 'Gaju',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        action: 'Thread matching completed'
      }
    ]
  },
  {
    id: 'demo-4',
    type: 'Shirt',
    billNumber: 'SH004',
    status: WORKFLOW_STATES.AWAITING_STITCHING,
    assignedTo: 'Tailor 1',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
    history: [
      {
        status: WORKFLOW_STATES.AWAITING_CUTTING,
        assignedTo: 'Admin',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        action: 'Item created by Admin'
      },
      {
        status: WORKFLOW_STATES.AWAITING_CUTTING,
        assignedTo: 'Feroz',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        action: 'Assigned to Feroz for cutting'
      },
      {
        status: WORKFLOW_STATES.AWAITING_TAILOR_ASSIGNMENT,
        assignedTo: 'Gaju',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        action: 'Thread matching completed'
      },
      {
        status: WORKFLOW_STATES.AWAITING_STITCHING,
        assignedTo: 'Tailor 1',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        action: 'Assigned to Tailor 1'
      }
    ]
  },
  {
    id: 'demo-5',
    type: 'Pant',
    billNumber: 'PT005',
    status: WORKFLOW_STATES.AWAITING_IRONING,
    assignedTo: 'Abdul Kadir',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
    history: [
      {
        status: WORKFLOW_STATES.AWAITING_CUTTING,
        assignedTo: 'Admin',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        action: 'Item created by Admin'
      },
      {
        status: WORKFLOW_STATES.AWAITING_CUTTING,
        assignedTo: 'Feroz',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        action: 'Assigned to Feroz for cutting'
      },
      {
        status: WORKFLOW_STATES.AWAITING_CUTTING,
        assignedTo: 'Feroz',
        timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        action: 'Cutting completed'
      },
      {
        status: WORKFLOW_STATES.AWAITING_TAILOR_ASSIGNMENT,
        assignedTo: 'Gaju',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        action: 'Thread matching completed'
      },
      {
        status: WORKFLOW_STATES.AWAITING_STITCHING,
        assignedTo: 'Tailor 2',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        action: 'Assigned to Tailor 2'
      },
      {
        status: WORKFLOW_STATES.AWAITING_KAACH,
        assignedTo: 'Abdul',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        action: 'Completed Awaiting Stitching'
      }
    ]
  },
  {
    id: 'demo-6',
    type: 'Kurta',
    billNumber: 'KT006',
    status: WORKFLOW_STATES.AWAITING_IRONING,
    assignedTo: null,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    history: [
      {
        status: WORKFLOW_STATES.AWAITING_CUTTING,
        assignedTo: 'Admin',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        action: 'Item created by Admin'
      },
      {
        status: WORKFLOW_STATES.AWAITING_CUTTING,
        assignedTo: 'Feroz',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        action: 'Assigned to Feroz for cutting'
      },
      {
        status: WORKFLOW_STATES.AWAITING_CUTTING,
        assignedTo: 'Feroz',
        timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
        action: 'Cutting completed'
      },
      {
        status: WORKFLOW_STATES.AWAITING_TAILOR_ASSIGNMENT,
        assignedTo: 'Gaju',
        timestamp: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
        action: 'Completed Awaiting Cutting'
      },
      {
        status: WORKFLOW_STATES.AWAITING_STITCHING,
        assignedTo: 'Tailor 3',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        action: 'Assigned to Tailor 3'
      },
      {
        status: WORKFLOW_STATES.AWAITING_KAACH,
        assignedTo: 'Abdul',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        action: 'Completed Awaiting Stitching'
      },
      {
        status: WORKFLOW_STATES.AWAITING_IRONING,
        assignedTo: null,
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        action: 'Completed Awaiting Buttoning'
      }
    ]
  }
];

// Function to load demo data into the store
export const loadDemoData = (store) => {
  // Add demo items to the store
  store.setState(state => ({
    clothItems: [...state.clothItems, ...DEMO_ITEMS]
  }));
  
  console.log('Demo data loaded successfully!');
};

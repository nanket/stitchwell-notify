# StitchWell Tracking - Tailoring Business Workflow Management System

A comprehensive prototype for managing tailoring business workflows with real-time tracking, role-based access, and automated notifications.

## 🎯 Overview

StitchWell Tracking is a client-side workflow management system designed specifically for tailoring businesses. It provides a complete solution for tracking cloth items through various stages of the tailoring process, from initial threading to final ironing.

## ✨ Key Features

### 🔐 Role-Based Access Control
- **Admin Mode (Gaju)**: Complete dashboard with item creation, assignment, and overview
- **Worker Mode**: Specialized interfaces for Threading, Cutting, Tailoring, and Buttoning workers
- Secure login system with predefined user roles

### 📊 Real-Time Workflow Tracking
- **Kanban Board Interface**: Visual representation of all items across workflow stages
- **Live Status Updates**: Real-time tracking of item progress and assignments
- **Automated Progression**: Items automatically move to next stage upon task completion

### 🔔 Smart Notification System
- **Real-Time Alerts**: Instant notifications when items are assigned
- **Toast Messages**: Non-blocking UI notifications for all actions
- **Notification Panel**: Centralized notification management with read/unread status

### 📱 Modern, Responsive Design
- **Mobile-First**: Fully responsive design that works on all devices
- **Clean UI**: Elegant interface built with Tailwind CSS
- **Smooth Animations**: Polished user experience with subtle animations

## 🏗️ System Architecture

### Workflow States
1. **Awaiting Threading** → Assigned to Abdul
2. **Awaiting Cutting** → Assigned to Feroz
3. **Awaiting Stitching Assignment** → Assigned to Admin (Gaju)
4. **Awaiting Stitching** → Assigned to specific Tailor
5. **Awaiting Buttoning** → Assigned to Abdul
6. **Ready for Iron** → Final state

### Data Structure
```javascript
{
  id: 'unique-id',
  type: 'Shirt|Pant|Kurta',
  billNumber: 'unique-bill-number',
  status: 'current-workflow-state',
  assignedTo: 'worker-name',
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
  history: [/* workflow history */]
}
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd stitchwell-tracking-web-app

# Install dependencies
npm install

# Start development server
npm run dev
```

### Usage
1. Open http://localhost:5173 in your browser
2. Select your role from the login screen
3. Choose your worker name
4. Access your personalized dashboard

## 👥 User Roles & Access

### Admin (Gaju)
- **Dashboard**: Kanban board with complete workflow overview
- **Create Items**: Add new cloth items with bill numbers
- **Assign Tasks**: Assign items to specific tailors during stitching phase
- **Monitor Progress**: Real-time tracking of all items and workers
- **Notifications**: Receive updates on all workflow changes

### Threading Worker (Abdul)
- **Task List**: View items assigned for threading
- **Complete Tasks**: Mark threading tasks as complete
- **Notifications**: Receive new task assignments

### Cutting Worker (Feroz)
- **Task List**: View items assigned for cutting
- **Complete Tasks**: Mark cutting tasks as complete
- **Notifications**: Receive new task assignments

### Tailors (Tailor 1-4)
- **Task List**: View items assigned for stitching
- **Complete Tasks**: Mark stitching tasks as complete
- **Notifications**: Receive new task assignments

### Buttoning Worker (Abdul)
- **Task List**: View items assigned for buttoning
- **Complete Tasks**: Mark buttoning tasks as complete
- **Notifications**: Receive new task assignments

## 🛠️ Technology Stack

- **Frontend**: React 18 with Vite
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Build Tool**: Vite
- **Package Manager**: npm

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── AdminDashboard.jsx
│   ├── WorkerDashboard.jsx
│   ├── LoginScreen.jsx
│   ├── KanbanBoard.jsx
│   ├── CreateItemModal.jsx
│   ├── TaskCard.jsx
│   └── NotificationPanel.jsx
├── store/               # State management
│   └── useStore.js      # Zustand store
├── App.jsx             # Main application component
├── main.jsx            # Application entry point
└── index.css           # Global styles
```

## 🎨 Design System

### Color Palette
- **Primary**: Blue tones for main actions and branding
- **Secondary**: Gray tones for secondary elements
- **Status Colors**:
  - Threading: Blue
  - Cutting: Yellow
  - Stitching: Orange/Purple
  - Buttoning: Indigo
  - Complete: Green

### Typography
- **Headings**: Semibold weights for hierarchy
- **Body**: Regular weight for readability
- **Labels**: Medium weight for emphasis

## 🔄 Workflow Logic

### Item Creation
1. Admin creates new item with type and bill number
2. Item automatically assigned to Abdul for threading
3. Notification sent to Abdul

### Task Completion
1. Worker marks task as complete
2. Item status updated to next stage
3. Item assigned to next worker in workflow
4. Notification sent to newly assigned worker
5. Toast confirmation displayed

### Assignment Logic
- **Threading**: Always assigned to Abdul
- **Cutting**: Always assigned to Feroz
- **Stitching Assignment**: Returns to Admin for tailor selection
- **Stitching**: Assigned to specific tailor chosen by Admin
- **Buttoning**: Always assigned to Abdul
- **Ready for Iron**: Final state, no assignment needed

## 📊 Features Demonstration

### Admin Workflow
1. Login as Admin (Gaju)
2. View dashboard with statistics and Kanban board
3. Create new cloth item
4. Monitor item progress through workflow
5. Assign items to specific tailors when needed
6. Receive notifications for all workflow changes

### Worker Workflow
1. Login with worker role and name
2. View personalized task list
3. Complete assigned tasks
4. Receive notifications for new assignments
5. Track task history and progress

## 🔧 Customization

### Adding New Workers
Update the `WORKERS` object in `src/store/useStore.js`:
```javascript
export const WORKERS = {
  [USER_ROLES.TAILOR]: ['Tailor 1', 'Tailor 2', 'New Tailor'],
  // ... other roles
};
```

### Adding New Cloth Types
Update the `CLOTH_TYPES` array in `src/store/useStore.js`:
```javascript
export const CLOTH_TYPES = ['Shirt', 'Pant', 'Kurta', 'New Type'];
```

### Modifying Workflow States
Update the `WORKFLOW_STATES` and `WORKFLOW_TRANSITIONS` in `src/store/useStore.js`

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 📝 License

This project is created as a prototype for tailoring business workflow management.

## 🤝 Contributing

This is a prototype system. For production use, consider adding:
- Backend API integration
- Database persistence
- User authentication
- Advanced reporting
- Mobile app version
- Print functionality for bills/receipts

---

**Built with ❤️ for efficient tailoring business management**

# 🧪 StitchWell Tracking System - Complete Testing Guide

This guide provides step-by-step instructions to test all features of the Tailoring Business Workflow Management System.

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Setup Instructions
1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Open Application**
   - The server will start on `http://localhost:5173` or `http://localhost:5174`
   - Open the URL shown in your terminal in your web browser

## 🎯 Testing Scenarios

### 📋 **Scenario 1: Admin Complete Workflow Test**

**Objective**: Test the complete admin workflow from item creation to completion

#### Step 1: Admin Login
1. Open the application in your browser
2. You should see the **StitchWell Tracking** login screen
3. Select **"Admin (Gaju)"** radio button
4. From the dropdown, select **"Gaju"**
5. Click **"Login to Dashboard"**

**Expected Result**: You should see the Admin Dashboard with:
- Header showing "StitchWell Admin"
- Statistics cards (all showing 0 initially)
- Empty Kanban board with 6 columns
- "Load Demo Data" button (if no items exist)

#### Step 2: Load Demo Data (Optional)
1. Click the **"Load Demo Data"** button
2. **Expected Result**: 
   - Toast notification: "Demo data loaded successfully!"
   - Statistics cards update with numbers
   - Kanban board populates with sample items across different stages
   - "Load Demo Data" button disappears

#### Step 3: Create New Item
1. Click the **"New Item"** button in the header
2. **Expected Result**: Modal opens with "Create New Item" title
3. Select a cloth type: **"Shirt"**, **"Pant"**, or **"Kurta"**
4. Enter a unique bill number (e.g., "TEST001")
5. Click **"Create Item"**

**Expected Results**:
- Toast notification: "Shirt item created successfully!"
- Modal closes
- New item appears in "Threading" column
- Statistics update
- Item is assigned to "Abdul"

#### Step 4: Test Notifications
1. Click the **Bell icon** in the header
2. **Expected Result**: Notification panel opens showing:
   - New notification about item assignment
   - Timestamp showing "Just now" or recent time
   - Unread indicator (blue dot)

#### Step 5: Test Tailor Assignment
1. Look for items in the **"Stitching Assignment"** column
2. Find the dropdown labeled "Assign to Tailor"
3. Select a tailor (e.g., "Tailor 1")
4. **Expected Results**:
   - Toast notification: "Item assigned to Tailor 1!"
   - Item moves to "Stitching" column
   - Item shows "Assigned to: Tailor 1"

---

### 👷 **Scenario 2: Worker Workflow Test**

**Objective**: Test worker login and task completion

#### Step 1: Worker Login
1. **Logout** from admin (click Logout button)
2. Select **"Threading Worker"** role
3. Select **"Abdul"** from dropdown
4. Click **"Login to Dashboard"**

**Expected Result**: Worker dashboard showing:
- Header: "My Tasks" with "Threading Worker Dashboard"
- Statistics cards showing assigned tasks
- Task list with items assigned to Abdul

#### Step 2: Complete a Task
1. Find a task card in the task list
2. Click **"Mark Complete"** button
3. **Expected Results**:
   - Button shows "Completing..." with spinner
   - Toast notification: "Task completed! Item moved to [next stage]"
   - Task disappears from the list
   - Statistics update

#### Step 3: Test Task History
1. Before completing a task, click **"History"** button
2. **Expected Result**: History section expands showing:
   - Timeline of task progression
   - Timestamps for each action
   - Status changes and assignments

---

### 🔄 **Scenario 3: Complete Workflow Progression Test**

**Objective**: Test an item moving through all workflow stages

#### Step 1: Create Item as Admin
1. Login as Admin (Gaju)
2. Create a new item (e.g., "FLOW001")
3. Note: Item starts in "Threading" assigned to Abdul

#### Step 2: Threading Stage
1. Logout and login as **Threading Worker → Abdul**
2. Find the "FLOW001" item in task list
3. Click **"Mark Complete"**
4. **Expected**: Item moves to "Cutting" stage, assigned to Feroz

#### Step 3: Cutting Stage
1. Logout and login as **Cutting Worker → Feroz**
2. Find the "FLOW001" item in task list
3. Click **"Mark Complete"**
4. **Expected**: Item moves to "Stitching Assignment", assigned to Gaju

#### Step 4: Stitching Assignment
1. Logout and login as **Admin → Gaju**
2. Find "FLOW001" in "Stitching Assignment" column
3. Use dropdown to assign to a tailor (e.g., "Tailor 2")
4. **Expected**: Item moves to "Stitching" column, assigned to Tailor 2

#### Step 5: Stitching Stage
1. Logout and login as **Tailor → Tailor 2**
2. Find the "FLOW001" item in task list
3. Click **"Mark Complete"**
4. **Expected**: Item moves to "Buttoning", assigned to Abdul

#### Step 6: Buttoning Stage
1. Logout and login as **Buttoning Worker → Abdul**
2. Find the "FLOW001" item in task list
3. Click **"Mark Complete"**
4. **Expected**: Item moves to "Ready for Iron" (final stage)

#### Step 7: Verify Completion
1. Login as Admin to see the completed item in "Ready for Iron" column
2. **Expected**: Item shows green "Complete" indicator

---

### 🔔 **Scenario 4: Notification System Test**

**Objective**: Test real-time notifications across different users

#### Step 1: Setup
1. Open the application in **two different browser windows/tabs**
2. Login as **Admin** in first window
3. Login as **Threading Worker (Abdul)** in second window

#### Step 2: Create Item and Test Notifications
1. In Admin window: Create a new item
2. In Abdul's window: Check notifications (bell icon)
3. **Expected**: Abdul receives notification about new assignment

#### Step 3: Complete Task and Test Chain Notifications
1. In Abdul's window: Complete the threading task
2. Switch to Admin window: Check notifications
3. **Expected**: Admin receives notification about task completion

#### Step 4: Test Notification Features
1. Click on a notification to mark it as read
2. **Expected**: Blue dot disappears, notification appears dimmed
3. Click "Mark all as read" button
4. **Expected**: All notifications marked as read

---

### 📱 **Scenario 5: Responsive Design Test**

**Objective**: Test mobile and tablet responsiveness

#### Step 1: Desktop View
1. Test on full desktop browser
2. **Expected**: Full Kanban board visible, all features accessible

#### Step 2: Tablet View
1. Resize browser to tablet width (~768px)
2. **Expected**: 
   - Kanban board remains scrollable horizontally
   - Statistics cards stack appropriately
   - All buttons remain accessible

#### Step 3: Mobile View
1. Resize browser to mobile width (~375px)
2. **Expected**:
   - Login screen remains centered and readable
   - Dashboard adapts to single column layout
   - Task cards stack vertically
   - Navigation remains functional

---

### ⚠️ **Scenario 6: Error Handling Test**

**Objective**: Test error conditions and edge cases

#### Step 1: Duplicate Bill Number
1. Login as Admin
2. Create item with bill number "DUP001"
3. Try to create another item with same bill number "DUP001"
4. **Expected**: Error message "Bill number already exists"

#### Step 2: Empty Form Submission
1. Try to create item without selecting type
2. **Expected**: Error message "Please select a cloth type"
3. Try to create item without bill number
4. **Expected**: Error message "Bill number is required"

#### Step 3: Network Simulation
1. Complete tasks rapidly to test loading states
2. **Expected**: Loading spinners appear during task completion

---

## 🎨 **Visual Testing Checklist**

### ✅ **UI Elements to Verify**

#### Login Screen
- [ ] Centered layout with logo
- [ ] Radio buttons work correctly
- [ ] Dropdown populates based on role selection
- [ ] Login button enables/disables appropriately
- [ ] Smooth animations on role selection

#### Admin Dashboard
- [ ] Statistics cards display correct numbers
- [ ] Kanban board shows all 6 columns
- [ ] Items display with correct colors by type
- [ ] Notification badge shows unread count
- [ ] Create modal opens/closes smoothly

#### Worker Dashboard
- [ ] Task cards show complete information
- [ ] History expansion works smoothly
- [ ] Complete button shows loading state
- [ ] Empty state displays when no tasks

#### Notifications
- [ ] Toast notifications appear and disappear
- [ ] Notification panel positions correctly
- [ ] Read/unread states display properly
- [ ] Timestamps format correctly

---

## 🐛 **Common Issues & Solutions**

### Issue: "Port already in use"
**Solution**: The dev server will automatically use the next available port (5174, 5175, etc.)

### Issue: Styles not loading
**Solution**: 
1. Stop the dev server (Ctrl+C)
2. Run `npm install -D @tailwindcss/postcss`
3. Restart with `npm run dev`

### Issue: Demo data not loading
**Solution**: Refresh the page and try again. The button only appears when no items exist.

### Issue: Notifications not appearing
**Solution**: Make sure you're testing with different user roles in separate browser windows/tabs.

---

## 📊 **Success Criteria**

After completing all scenarios, you should have verified:

- ✅ **Authentication**: All user roles can login successfully
- ✅ **Workflow**: Items progress through all 6 stages correctly
- ✅ **Notifications**: Real-time notifications work across users
- ✅ **UI/UX**: Responsive design works on all screen sizes
- ✅ **Error Handling**: Appropriate error messages display
- ✅ **State Management**: Data persists during user session
- ✅ **Performance**: Smooth animations and quick responses

---

## 🎯 **Quick Test Summary**

For a rapid test of core functionality:

1. **Login as Admin** → Create item → Verify it appears in Threading column
2. **Login as Abdul** → Complete threading task → Verify item moves to Cutting
3. **Login as Feroz** → Complete cutting task → Verify item moves to Assignment
4. **Login as Admin** → Assign to tailor → Verify item moves to Stitching
5. **Check notifications** throughout the process

**Total Test Time**: ~10-15 minutes for complete workflow

---

**🎉 Congratulations!** If all tests pass, you have successfully verified the complete Tailoring Business Workflow Management System!

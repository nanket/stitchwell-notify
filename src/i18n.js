// Lightweight i18n without external deps
// - React Context for components
// - Global helpers for non-React modules (e.g., store)
// - Persists language in localStorage (default: Hindi 'hi')

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const LANG_KEY = 'stitchwell_lang';
const DEFAULT_LANG = 'hi';

function getInitialLanguage() {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored) return stored;
  } catch (_) {}
  return DEFAULT_LANG;
}

// Basic interpolation: replace {key} with value
function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`));
}

// Translation dictionaries
const translations = {
  en: {
    common: {
      app_name: 'StitchWell Tracking',
      yes: 'Yes',
      no: 'No',
      all: 'All',
      cancel: 'Cancel',
      confirm: 'Confirm',
      delete: 'Delete',
      install: 'Install',
      later: 'Later',
      enable: 'Enable',
      logout: 'Logout',
      add: 'Add',
      remove: 'Remove',
      actions: 'Actions',
      status: 'Status',
      type: 'Type',
      bill: 'Bill',
      assigned_to: 'Assigned To',
      updated: 'Updated:',
      page: 'Page {n} / {m}',
      showing: 'Showing {from}-{to} of {total}',
      total: 'Total',
      close: 'Close'
    },
    auth: {
      heading: 'Sign in to your account',
      subtitle: 'Use your assigned username and password',
      username: 'Username',
      password: 'Password',
      sign_in: 'Sign In',
      username_placeholder: 'e.g. abdul, feroz, admin',
      password_hint: 'Password is your name + 1234. Example: abdul1234, abdulkadir1234',
      invalid_login: 'Invalid username or password'
    },
    app: {
      install_title: 'Install StitchWell?',
      install_subtitle: 'Add the app to your home screen for better notifications.',
      notif_banner: 'Enable notifications to receive task alerts even when the app is closed.'
    },
    admin: {
      title: 'StitchWell Admin',
      subtitle: 'Workflow Management Dashboard',
      load_demo: 'Load Demo Data',
      manage_workers: 'Manage Workers',
      new_item: 'New Item',
      stats_total: 'Total Items',
      stats_in_progress: 'In Progress',
      stats_completed: 'Completed',
      stats_pending: 'Pending Assignment',
      table_title: 'Workflow Items (Table View)',
      table_subtitle: 'Filter, sort and paginate items for large datasets',
      analytics: 'Analytics'
    },
    filters: {
      search: 'Search',
      search_placeholder: 'Bill #, Type or Assignee',
      status: 'Status',
      type: 'Type',
      assignee: 'Assignee',
      page_size: 'Page size',
      group_by_bill: 'Group by bill'
    },
    table: {
      bill: 'Bill #',
      type: 'Type',
      status: 'Status',
      customer: 'Customer',
      assigned_to: 'Assigned To',
      updated: 'Updated',
      actions: 'Actions',
      delete: 'Delete',
      empty: 'No items found',
      assign_tailor: 'Assign tailor...',
      override_assign: 'Override assign...',
      no_action: 'No action',
      first: 'First',
      prev: 'Prev',
      next: 'Next',
      last: 'Last'
    },
    kanban: {
      unassigned: 'Unassigned',
      assign_to_tailor: 'Assign to Tailor:',
      select_tailor: 'Select tailor...',
      empty_stage: 'No items in this stage'
    },
    worker: {
      my_tasks: 'My Tasks',
      dashboard: '{role} Dashboard',
      name_label: 'Worker',
      assigned_tasks: 'Assigned Tasks',
      notifications: 'Notifications',
      my_assigned_tasks: 'My Assigned Tasks',
      complete_hint: 'Complete your assigned tasks to move items through the workflow',
      no_tasks_title: 'No tasks assigned',
      no_tasks_body: "You don't have any tasks assigned at the moment. Check back later or contact your supervisor.",
      stats_assigned: 'Assigned',
      stats_in_progress: 'In Progress',
      stats_notifications: 'Notifications',
      section_title: 'Your Assigned Tasks',
      section_subtitle: 'Work on your current assignments below',
      search_placeholder: 'Search by bill #, type, customer, or status...',
      compact_view: 'Compact View',
      normal_view: 'Normal View',
      filter_by_status: 'Filter by Status',
      sort_by: 'Sort by',
      sort_date_desc: 'Newest First',
      sort_date_asc: 'Oldest First',
      sort_bill: 'Bill Number',
      sort_status: 'Status',
      all_statuses: 'All Statuses',
      clear_search: 'Clear search',
      my_tasks: 'My Tasks',
      name_label: 'Worker Name'
    },
    analytics: {
      monthly_report: 'Monthly Report',
      previous_month: 'Previous Month',
      next_month: 'Next Month',
      total_completed: 'Total Completed',
      completion_rate: 'Completion Rate',
      items_assigned: 'Items Assigned',
      items_completed: 'Items Completed',
      final_completions: 'Final Completions',
      stage_completions: 'Stage Completions',
      stage_breakdown: 'Stage Breakdown',

      worker_performance: 'Worker Performance',
      item_type_breakdown: 'Item Type Breakdown',
      completed_items: 'Completed Items',
      completion_details: 'Completion Details',
      no_completions: 'No completions this month',
      no_items: 'No items to display',
      completed_by: 'Completed by',
      avg_completion_time: 'Avg. Completion Time',
      personal_stats: 'Personal Statistics',
      monthly_performance: 'Monthly Performance',
      completion_history: 'Completion History',
      performance_trends: 'Performance Trends',
      worker_breakdown: 'Worker Breakdown',
      overall_stats: 'Overall Statistics',
      performance_excellent: 'Excellent',
      performance_good: 'Good',
      performance_average: 'Average',
      performance_needs_improvement: 'Needs Improvement',
      performance_level: 'Performance Level',
      recent_completions: 'Recent Completions',
      total_pieces: 'Total Pieces',
      avg_per_day: 'Avg. Per Day',
      top_category: 'Top Category',
      more_items: 'more items',
      active_workers: 'Active Workers',
      monthly_completion: {
        title: 'Completed this month',
        select_month: 'Select month'
      },
      details: {
        title: 'Completion details',
        select_month: 'Select month',
        total: 'Total completed',
        unknown_tailor: 'Unknown',
        assigned_on: 'Assigned on',
        completed_on: 'Completed on',
        per_page: 'Per page',
        showing_tailors: 'Showing {from}-{to} of {total} tailors',
        show_more: 'Show {count} more items',
        show_less: 'Show less',
        page_info: 'Page {current} of {total}',
        prev: 'Previous',
        next: 'Next',
        close: 'Close',
        empty: 'No completed items for this month',
        view: 'View details'
      }
    },

    workers: {
      manage_title: 'Manage Workers',
      add_placeholder: 'Add {role} name',
      none_yet: 'No workers yet.',
      default: 'Default',
      make_default: 'Make default',
      registered_creds: 'Registered. Share these credentials with the worker:',
      username: 'Username',
      password: 'Password'
    },
    create_item: {
      title: 'Create New Item',
      subtitle: 'Add a new cloth item to the workflow',
      cloth_type: 'Cloth Type *',
      bill_number: 'Bill Number *',
      bill_placeholder: 'Enter bill number',
      customer_name: 'Customer Name (Optional)',
      customer_placeholder: 'Enter customer name',
      cancel: 'Cancel',
      create: 'Create Item',
      creating: 'Creating...',
      error_select_type: 'Please select a cloth type',
      error_bill_required: 'Bill number is required',
      error_bill_exists: 'Bill number already exists'
      ,
      quantity: 'Quantity *',
      quantity_placeholder: 'Enter quantity',
      error_quantity_min: 'Quantity must be at least 1',

      photos: 'Photos (optional)',
      add_photo: 'Add photo',
      selected: 'selected',
      photo_hint: 'Use camera or gallery',
      uploading: 'Uploading',
      upload_error: 'Upload failed. Please try again.'

    },
    card: {
      bill: 'Bill #',
      item_of_type: '{type} Item',
      assigned_to: 'Assigned to: {name}',
      updated: 'Updated: {date}',
      history: 'History',
      completing: 'Completing...',
      mark_complete: 'Mark Complete',
      task_history: 'Task History',
      status: 'Status: {status}',
      assigned: 'Assigned: {name}'
    },
    photos: {
      delete: 'Delete photo'
    },
    notif_panel: {
      title: 'Notifications',
      empty_title: 'No notifications',
      empty_hint: "You're all caught up! New notifications will appear here.",
      mark_all_read: 'Mark all as read',
      just_now: 'Just now',
      m_ago: '{m}m ago',
      h_ago: '{h}h ago'
    },

    dialog: {
      confirm_title: 'Confirm Action',
      confirm_msg: 'Are you sure you want to proceed?',
      confirm: 'Confirm',
      cancel: 'Cancel',
      delete_title: 'Delete Item',
      delete_msg: 'Are you sure you want to delete item "{bill}"? This action cannot be undone.'
    },
    roles: {
      Admin: 'Admin',
      'Threading Worker': 'Threading Worker',
      'Cutting Worker': 'Cutting Worker',
      Tailor: 'Tailor',
      'Buttoning Worker': 'Buttoning Worker',
      'Ironing Worker': 'Ironing Worker',
      'Packaging Worker': 'Packaging Worker'
    },
    types: {
      Shirt: 'Shirt',
      Pant: 'Pant',
      Kurta: 'Kurta',
      Safari: 'Safari'
    },
    statuses: {
      'Awaiting Cutting': 'Awaiting Cutting',
      'Awaiting Thread Matching': 'Awaiting Thread Matching',
      'Awaiting Tailor Assignment': 'Awaiting Tailor Assignment',
      'Awaiting Stitching': 'Awaiting Stitching',
      'Awaiting Kaach': 'Awaiting Kaach',
      'Awaiting Ironing': 'Awaiting Ironing',
      'Awaiting Packaging': 'Awaiting Packaging',
      Ready: 'Ready'
    },
    store: {
      added_to_role: 'Added {name} to {role}',
      failed_add_worker: 'Failed to add worker',
      removed_from_role: 'Removed {name} from {role}',
      failed_remove_worker: 'Failed to remove worker',
      default_set: '{name} is now default for {role}',
      failed_default: 'Failed to set default worker',
      created_ok: '{type} item created successfully!',
      failed_create: 'Failed to create item',
      task_completed_moved: 'Task completed! Item moved to {status}',
      failed_update_task: 'Failed to update task',
      item_not_found: 'Item not found! ',
      no_valid_transition: 'No valid transition available!',
      only_admin_delete: 'Only admin users can delete items!',
      deleted_ok: 'Item {bill} deleted successfully!',
      failed_delete: 'Failed to delete item',
      push_task: 'StitchWell Task',
      push_update: 'You have a new task update',
      new_task_title: 'New task: Bill #{bill} ({type})',
      new_task_body_cutting: 'New task: Bill #{bill} ({type}) assigned for cutting',
      new_task_body_stage: 'New task: Bill #{bill} ({type}) assigned for {stage}',
      task_done_title: 'Task completed: Bill #{bill} ({type})',
      task_done_body: 'Task completed: Bill #{bill} ({type}) ready for {stage}'
    },
    notify: {
      assign: {
        generic: {
          title_1: 'New task: Bill #{bill} ({type})',
          body_1: 'Next step: {stage}'
        },
        cutting: {
          title_1: 'Cut next: Bill #{bill} ({type})',
          title_2: 'Ready for cutting: Bill #{bill} ({type})',
          body_1: 'Start cutting now',
          body_2: 'Queue up cutting for this order'
        },
        threading: {
          title_1: 'Match thread: Bill #{bill} ({type})',
          title_2: 'Thread color match needed: Bill #{bill}',
          body_1: 'Choose matching thread and prep',
          body_2: 'Match thread color for this piece'
        },
        stitching: {
          title_1: 'Start stitching: Bill #{bill} ({type})',
          title_2: 'Stitch now: Bill #{bill} ({type})',
          body_1: 'Begin stitching for this piece',
          body_2: 'Proceed with stitching'
        },
        kaach: {
          title_1: 'Do kaach: Bill #{bill} ({type})',
          body_1: 'Add buttons/kaach and finish prep'
        },
        ironing: {
          title_1: 'Press and finish: Bill #{bill} ({type})',
          body_1: 'Iron neatly and prepare for packing'
        },
        packaging: {
          title_1: 'Pack and seal: Bill #{bill} ({type})',
          body_1: 'Pack securely and mark ready'
        }
      },
      progress: {
        to_stage: {
          title_1: 'Moved to {stage}: Bill #{bill} ({type})',
          title_2: 'Next step: {stage} — Bill #{bill} ({type})',
          body_1: 'Next up: {stage}',
          body_2: 'Please proceed with {stage}'
        }
      }
    }
    ,history: {
      actions: {
        created_by_admin: 'Item created by Admin',
        assigned_for_stage: 'Assigned to {name} for {stage}',
        completed_stage: '{stage} completed'
      },
      stage: {
        cutting: 'cutting',
        thread_matching: 'thread matching',
        tailor_assignment: 'tailor assignment',
        stitching: 'stitching',
        kaach: 'kaach',
        ironing: 'ironing',
        packaging: 'packaging'
      }
    }

  },
  hi: {
    common: {
      app_name: 'स्टिचवेल ट्रैकिंग',
      yes: 'हाँ',
      no: 'नहीं',
      all: 'सभी',
      cancel: 'रद्द करें',
      confirm: 'पुष्टि करें',
      delete: 'हटाएँ',
      install: 'इंस्टॉल करें',
      later: 'बाद में',
      enable: 'सक्रिय करें',
      logout: 'लॉग आउट',
      add: 'जोड़ें',
      remove: 'हटाएँ',
      actions: 'क्रियाएँ',
      status: 'स्थिति',
      type: 'प्रकार',
      bill: 'बिल',
      assigned_to: 'असाइन',
      updated: 'अपडेटेड:',
      page: 'पृष्ठ {n} / {m}',
      showing: 'दिखा रहे हैं {from}-{to} कुल {total} में से',
      total: 'कुल',
      close: 'बंद करें'
    },
    auth: {
      heading: 'अपने खाते में साइन इन करें',
      subtitle: 'अपने असाइन किए गए उपयोगकर्ता नाम और पासवर्ड का उपयोग करें',
      username: 'उपयोगकर्ता नाम',
      password: 'पासवर्ड',
      sign_in: 'साइन इन करें',
      username_placeholder: 'जैसे abdul, feroz, admin',
      password_hint: 'पासवर्ड = आपका नाम + 1234. उदाहरण: abdul1234, abdulkadir1234',
      invalid_login: 'गलत उपयोगकर्ता नाम या पासवर्ड'
    },
    app: {
      install_title: 'स्टिचवेल इंस्टॉल करें?',
      install_subtitle: 'बेहतर सूचनाओं के लिए ऐप को होम स्क्रीन पर जोड़ें।',
      notif_banner: 'ऐप बंद होने पर भी कार्य अलर्ट पाने के लिए सूचनाएँ सक्षम करें।'
    },
    admin: {
      title: 'स्टिचवेल एडमिन',
      subtitle: 'कार्यप्रवाह प्रबंधन डैशबोर्ड',
      load_demo: 'डेमो डेटा लोड करें',
      manage_workers: 'कर्मचारियों का प्रबंधन',
      new_item: 'नया आइटम',
      stats_total: 'कुल आइटम',
      stats_in_progress: 'प्रगति पर',
      stats_completed: 'पूर्ण',
      stats_pending: 'असाइनमेंट बाकी',
      table_title: 'कार्यप्रवाह आइटम (तालिका)',
      table_subtitle: 'बड़े डेटा सेट के लिए फ़िल्टर, सॉर्ट और पेजिनेशन करें',
      analytics: 'विश्लेषण'
    },
    filters: {
      search: 'खोज',
      search_placeholder: 'बिल #, प्रकार या असाइनी',
      status: 'स्थिति',
      type: 'प्रकार',
      assignee: 'असाइनी',
      page_size: 'पेज आकार',
      group_by_bill: 'बिल के अनुसार समूह'
    },
    table: {
      bill: 'बिल #',
      type: 'प्रकार',
      status: 'स्थिति',
      customer: 'ग्राहक',
      assigned_to: 'असाइन',
      updated: 'अपडेटेड',
      actions: 'क्रियाएँ',
      delete: 'हटाएँ',
      empty: 'कोई आइटम नहीं मिला',
      assign_tailor: 'टेलर असाइन करें...',
      override_assign: 'ओवरराइड असाइन...',
      no_action: 'कोई क्रिया नहीं',
      first: 'पहला',
      prev: 'पिछला',
      next: 'अगला',
      last: 'आख़िरी'
    },
    kanban: {
      unassigned: 'असाइन नहीं',
      assign_to_tailor: 'टेलर को असाइन करें:',
      select_tailor: 'टेलर चुनें...',
      empty_stage: 'इस चरण में कोई आइटम नहीं'
    },
    worker: {
      my_tasks: 'मेरे कार्य',
      dashboard: '{role} डैशबोर्ड',
      name_label: 'कर्मी',
      assigned_tasks: 'असाइन किए गए कार्य',
      notifications: 'सूचनाएँ',
      my_assigned_tasks: 'मेरे असाइन किए गए कार्य',
      complete_hint: 'आइटम को आगे बढ़ाने के लिए अपने कार्य पूरे करें',
      no_tasks_title: 'कोई कार्य असाइन नहीं है',
      no_tasks_body: 'इस समय आपके पास कोई कार्य नहीं है। बाद में देखें या पर्यवेक्षक से संपर्क करें।',
      stats_assigned: 'असाइन',
      stats_in_progress: 'प्रगति पर',
      stats_notifications: 'सूचनाएँ',
      section_title: 'आपको असाइन किए गए कार्य',
      section_subtitle: 'अपने मौजूदा कार्य यहाँ पूरा करें',
      search_placeholder: 'बिल #, प्रकार, ग्राहक या स्थिति से खोजें...',
      compact_view: 'संक्षिप्त दृश्य',
      normal_view: 'सामान्य दृश्य',
      filter_by_status: 'स्थिति के अनुसार फ़िल्टर करें',
      sort_by: 'इसके अनुसार क्रमबद्ध करें',
      sort_date_desc: 'नवीनतम पहले',
      sort_date_asc: 'पुराने पहले',
      sort_bill: 'बिल नंबर',
      sort_status: 'स्थिति',
      all_statuses: 'सभी स्थितियाँ',
      clear_search: 'खोज साफ़ करें',
      my_tasks: 'मेरे कार्य',
      name_label: 'कारीगर का नाम'
    },
    analytics: {
      monthly_report: 'मासिक रिपोर्ट',
      previous_month: 'पिछला महीना',
      next_month: 'अगला महीना',
      final_completions: 'अंतिम पूर्ण (Ready)',
      stage_completions: 'चरण पूर्णताएँ',
      stage_breakdown: 'चरणवार विवरण',

      total_completed: 'कुल तैयार वस्त्र',
      completion_rate: 'कार्य पूर्णता दर',
      items_assigned: 'सौंपे गए कार्य',
      items_completed: 'पूर्ण किए गए कार्य',
      worker_performance: 'कारीगर प्रदर्शन',
      item_type_breakdown: 'वस्त्र प्रकार विवरण',
      completed_items: 'तैयार वस्त्र',
      completion_details: 'कार्य पूर्णता विवरण',
      no_completions: 'इस महीने कोई कार्य पूर्ण नहीं',
      no_items: 'दिखाने के लिए कोई वस्त्र नहीं',
      completed_by: 'द्वारा तैयार',
      avg_completion_time: 'औसत तैयारी समय',
      personal_stats: 'व्यक्तिगत आंकड़े',
      monthly_performance: 'मासिक कार्य प्रदर्शन',
      completion_history: 'कार्य पूर्णता इतिहास',
      performance_trends: 'प्रदर्शन रुझान',
      worker_breakdown: 'कारीगर विवरण',
      overall_stats: 'समग्र आंकड़े',
      performance_excellent: 'उत्कृष्ट',
      performance_good: 'अच्छा',
      performance_average: 'औसत',
      performance_needs_improvement: 'सुधार की आवश्यकता',
      performance_level: 'प्रदर्शन स्तर',
      recent_completions: 'हाल में तैयार वस्त्र',
      total_pieces: 'कुल टुकड़े',
      avg_per_day: 'औसत प्रति दिन',
      top_category: 'मुख्य श्रेणी',
      more_items: 'और वस्त्र',
      active_workers: 'सक्रिय कारीगर',
      monthly_completion: {
        title: 'इस माह पूर्ण',
        select_month: 'महीना चुनें'
      },
      details: {
        title: 'विस्तृत पूर्णता',
        select_month: 'महीना चुनें',
        total: 'कुल पूर्ण',
        unknown_tailor: 'अज्ञात',
        assigned_on: 'असाइन दिनांक',
        completed_on: 'पूर्ण दिनांक',
        per_page: 'प्रति पृष्ठ',
        showing_tailors: '{total} में से {from}-{to} दर्जी दिखा रहे हैं',
        show_more: '{count} और आइटम दिखाएं',
        show_less: 'कम दिखाएं',
        page_info: 'पृष्ठ {current} / {total}',
        prev: 'पिछला',
        next: 'अगला',
        close: 'बंद करें',
        empty: 'इस महीने कोई पूर्ण आइटम नहीं',
        view: 'विवरण देखें'
      }
    },
    common: {
      total: 'कुल',
      close: 'बंद करें'
    },
    workers: {
      manage_title: 'कर्मचारियों का प्रबंधन',
      add_placeholder: '{role} का नाम जोड़ें',
      none_yet: 'अभी कोई वर्कर नहीं।',
      default: 'डिफ़ॉल्ट',
      make_default: 'डिफ़ॉल्ट बनाएँ',
      registered_creds: 'रजिस्टर हो गया। ये लॉगिन विवरण वर्कर के साथ साझा करें:',
      username: 'यूज़रनेम',
      password: 'पासवर्ड'
    },
    create_item: {
      title: 'नया आइटम बनाएँ',
      subtitle: 'कार्यप्रवाह में नया कपड़ा आइटम जोड़ें',
      cloth_type: 'कपड़े का प्रकार *',
      bill_number: 'बिल नंबर *',
      bill_placeholder: 'बिल नंबर दर्ज करें',
      customer_name: 'ग्राहक का नाम (वैकल्पिक)',
      customer_placeholder: 'ग्राहक का नाम दर्ज करें',
      cancel: 'रद्द करें',
      create: 'आइटम बनाएँ',
      creating: 'बना रहा है...',
      error_select_type: 'कपड़े का प्रकार चुनें',
      error_bill_required: 'बिल नंबर आवश्यक है',
      error_bill_exists: 'यह बिल नंबर पहले से मौजूद है',
      quantity: 'मात्रा *',
      quantity_placeholder: 'मात्रा दर्ज करें',
      error_quantity_min: 'मात्रा कम से कम 1 होनी चाहिए',

      photos: 'फ़ोटो (वैकल्पिक)',
      add_photo: 'फ़ोटो जोड़ें',
      selected: 'चुना गया',
      photo_hint: 'कैमरा या गैलरी से चुनें',
      uploading: 'अपलोड हो रहा है',
      upload_error: 'अपलोड विफल। कृपया फिर से प्रयास करें।'
    },
    card: {
      bill: 'बिल #',
      item_of_type: '{type} आइटम',
      assigned_to: 'असाइन: {name}',
      updated: 'अपडेटेड: {date}',
      history: 'इतिहास',
      completing: 'पूरा कर रहा है...',
      mark_complete: 'पूर्ण करें',
      task_history: 'कार्य इतिहास',
      status: 'स्थिति: {status}',
      assigned: 'असाइन: {name}'
    },
    photos: {
      delete: 'फोटो हटाएँ'
    },
    notif_panel: {
      title: 'सूचनाएँ',
      empty_title: 'कोई सूचनाएँ नहीं',
      empty_hint: 'आप पूरी तरह अपडेट हैं! नई सूचनाएँ यहाँ दिखाई देंगी।',
      mark_all_read: 'सभी को पढ़ा चिह्नित करें',
      just_now: 'अभी',
      m_ago: '{m} मि पहले',
      h_ago: '{h} घं पहले'
    },
    dialog: {
      confirm_title: 'क्रिया की पुष्टि करें',
      confirm_msg: 'क्या आप जारी रखना चाहते हैं?',
      confirm: 'पुष्टि करें',
      cancel: 'रद्द करें',
      delete_title: 'आइटम हटाएँ',
      delete_msg: 'क्या आप वाकई आइटम "{bill}" हटाना चाहते हैं? यह क्रिया वापस नहीं होगी।'
    },

    roles: {
      Admin: 'एडमिन',
      'Threading Worker': 'धागा मिलान कर्मी',
      'Cutting Worker': 'कटिंग कर्मी',
      Tailor: 'टेलर',
      'Buttoning Worker': 'काँच/बटनिंग कर्मी',
      'Ironing Worker': 'इस्त्री कर्मी',
      'Packaging Worker': 'पैकिंग कर्मी'
    },
    types: {
      Shirt: 'शर्ट',
      Pant: 'पैंट',
      Kurta: 'कुर्ता',
      Safari: 'सफारी'
    },
    statuses: {
      'Awaiting Cutting': 'कटिंग बाकी',
      'Awaiting Thread Matching': 'धागा मिलान बाकी',
      'Awaiting Tailor Assignment': 'टेलर असाइनमेंट बाकी',
      'Awaiting Stitching': 'सिलाई बाकी',
      'Awaiting Kaach': 'काँच (बटनिंग) बाकी',
      'Awaiting Ironing': 'इस्त्री बाकी',
      'Awaiting Packaging': 'पैकिंग बाकी',
      Ready: 'तैयार'
    },
    store: {
      added_to_role: '{name} को {role} में जोड़ा गया',
      failed_add_worker: 'वर्कर जोड़ने में विफल',
      removed_from_role: '{name} को {role} से हटाया गया',
      failed_remove_worker: 'वर्कर हटाने में विफल',
      default_set: '{name} अब {role} के लिए डिफ़ॉल्ट है',
      failed_default: 'डिफ़ॉल्ट सेट करने में विफल',
      created_ok: '{type} आइटम सफलतापूर्वक बनाया गया!',
      failed_create: 'आइटम बनाने में विफल',
      task_completed_moved: 'कार्य पूर्ण! आइटम {status} पर चला गया',
      failed_update_task: 'कार्य अपडेट करने में विफल',
      item_not_found: 'आइटम नहीं मिला!',
      no_valid_transition: 'कोई मान्य ट्रांज़िशन उपलब्ध नहीं!',
      only_admin_delete: 'केवल एडमिन आइटम हटा सकते हैं!',
      deleted_ok: 'आइटम {bill} सफलतापूर्वक हटाया गया!',
      failed_delete: 'आइटम हटाने में विफल',
      push_task: 'स्टिचवेल कार्य',
      push_update: 'आपके पास नया कार्य अपडेट है',
      new_task_title: 'नया कार्य: बिल #{bill} ({type})',
      new_task_body_cutting: 'नया कार्य: बिल #{bill} ({type}) कटिंग के लिए असाइन',
      new_task_body_stage: 'नया कार्य: बिल #{bill} ({type}) {stage} के लिए असाइन',
      task_done_title: 'कार्य पूर्ण: बिल #{bill} ({type})',
      task_done_body: 'कार्य पूर्ण: बिल #{bill} ({type}) {stage} के लिए तैयार'
    },
    notify: {
      assign: {
        generic: {
          title_1: 'नया कार्य: बिल #{bill} ({type})',
          body_1: 'अगला चरण: {stage}'
        },
        cutting: {
          title_1: 'कटिंग करें: बिल #{bill} ({type})',
          title_2: 'कटिंग के लिए तैयार: बिल #{bill} ({type})',
          body_1: 'अभी कटिंग शुरू करें',
          body_2: 'इस ऑर्डर की कटिंग कतार में लगाएँ'
        },
        threading: {
          title_1: 'धागा मिलान: बिल #{bill} ({type})',
          title_2: 'थ्रेड मैच चाहिए: बिल #{bill}',
          body_1: 'मिलता धागा चुनें और तैयारी करें',
          body_2: 'धागे का रंग मिलाएँ'
        },
        stitching: {
          title_1: 'सिलाई शुरू करें: बिल #{bill} ({type})',
          title_2: 'अब सिलाई करें: बिल #{bill} ({type})',
          body_1: 'इस पीस की सिलाई शुरू करें',
          body_2: 'सिलाई आगे बढ़ाएँ'
        },
        kaach: {
          title_1: 'काँच करें: बिल #{bill} ({type})',
          body_1: 'बटन/काँच लगाएँ'
        },
        ironing: {
          title_1: 'इस्त्री करें और तैयार करें: बिल #{bill} ({type})',
          body_1: 'साफ-सुथरी इस्त्री करें, पैकिंग हेतु तैयार'
        },
        packaging: {
          title_1: 'पैक करें: बिल #{bill} ({type})',
          body_1: 'सुरक्षित पैक करें और रेडी मार्क करें'
        }
      },
      progress: {
        to_stage: {
          title_1: 'अब {stage}: बिल #{bill} ({type})',
          title_2: 'अगला चरण: {stage} — बिल #{bill} ({type})',
          body_1: 'अगला काम: {stage}',
          body_2: 'कृपया {stage} करें'
        }
      }
    }
    ,history: {
      actions: {
        created_by_admin: 'एडमिन द्वारा आइटम बनाया गया',
        assigned_for_stage: '{stage} के लिए {name} को असाइन किया गया',
        completed_stage: '{stage} पूर्ण'
      },
      stage: {
        cutting: 'कटिंग',
        thread_matching: 'धागा मिलान',
        tailor_assignment: 'टेलर असाइनमेंट',
        stitching: 'सिलाई',
        kaach: 'काँच',
        ironing: 'इस्त्री',
        packaging: 'पैकिंग'
      }
    }

  }
};

// Global language state for non-React usage
let currentLang = getInitialLanguage();
const subscribers = new Set();

function notify() { subscribers.forEach((cb) => { try { cb(currentLang); } catch {} }); }

export function setLanguageGlobal(lang) {
  currentLang = lang || DEFAULT_LANG;
  try { localStorage.setItem(LANG_KEY, currentLang); } catch (_) {}
  notify();
}

export function getLanguageGlobal() { return currentLang; }

export function tGlobal(key, params) {
  const dict = translations[currentLang] || translations[DEFAULT_LANG];
  const parts = String(key).split('.');
  let val = dict;
  for (const p of parts) { val = val?.[p]; }
  if (typeof val !== 'string') return key; // fallback to key if missing
  return interpolate(val, params);
}

export function translateStatus(value) {
  const dict = translations[currentLang]?.statuses || {};
  return dict[value] || value;
}
export function translateRole(value) {
  const dict = translations[currentLang]?.roles || {};
  return dict[value] || value;
}
export function translateClothType(value) {
  const dict = translations[currentLang]?.types || {};
  return dict[value] || value;
}

// React Context for components
const I18nContext = createContext({
  lang: currentLang,
  t: tGlobal,
  setLanguage: setLanguageGlobal,
  trStatus: translateStatus,
  trRole: translateRole,
  trType: translateClothType,
});

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(currentLang);

  useEffect(() => {
    const cb = (l) => setLang(l);
    subscribers.add(cb);
    return () => subscribers.delete(cb);
  }, []);

  const value = useMemo(() => ({
    lang,
    t: (k, p) => tGlobal(k, p),
    setLanguage: setLanguageGlobal,
    trStatus: translateStatus,
    trRole: translateRole,
    trType: translateClothType,
  }), [lang]);

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useI18n() {
  return useContext(I18nContext);
}


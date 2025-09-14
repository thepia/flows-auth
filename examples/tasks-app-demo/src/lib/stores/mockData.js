/**
 * Mock data for the assignment management demo
 * Realistic business scenarios without "offboarding" terminology
 */

// Helper function to create dates relative to now
const daysFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const hoursFromNow = (hours) => {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
};

export const mockTasks = [
  {
    id: 'task-001',
    title: 'Complete employee handbook review',
    description:
      'Please review the updated employee handbook and acknowledge completion. Pay special attention to:\n• New remote work policy (Section 4)\n• Updated benefits information (Section 7)\n• Code of conduct updates (Section 2)',
    status: 'assigned',
    priority: 'high',
    assignedBy: 'HR Team',
    assignedAt: daysFromNow(-2),
    dueDate: hoursFromNow(8), // Due today
    relatedDocuments: ['doc-001', 'doc-002'],
    notes: []
  },
  {
    id: 'task-002',
    title: 'Return company equipment',
    description:
      'Please return all company equipment to the IT department:\n• Laptop (Serial: LT-2024-0156)\n• Monitor (Serial: MON-2024-0089)\n• Keyboard and mouse\n• Power adapters\n\nLocation: IT Desk, 3rd Floor\nContact: tech-support@company.com',
    status: 'assigned',
    priority: 'medium',
    assignedBy: 'IT Department',
    assignedAt: daysFromNow(-1),
    dueDate: daysFromNow(1), // Due tomorrow
    relatedDocuments: ['doc-003'],
    notes: []
  },
  {
    id: 'task-003',
    title: 'Submit final project documentation',
    description:
      'Submit all project documentation and deliverables for the Q4 Marketing Campaign project:\n• Final presentation slides\n• Campaign analytics report\n• Budget reconciliation\n• Lessons learned document',
    status: 'in_progress',
    priority: 'high',
    assignedBy: 'Project Manager',
    assignedAt: hoursFromNow(-4),
    dueDate: daysFromNow(2),
    relatedDocuments: ['doc-004'],
    notes: ['Started working on analytics report', 'Waiting for final budget numbers from finance']
  },
  {
    id: 'task-004',
    title: 'Update emergency contact information',
    description:
      'Please verify and update your emergency contact information in the HR system. Ensure all details are current and accurate.',
    status: 'completed_pending',
    priority: 'medium',
    assignedBy: 'HR Team',
    assignedAt: daysFromNow(-3),
    dueDate: daysFromNow(-1),
    completedAt: hoursFromNow(-6),
    relatedDocuments: [],
    notes: ['Updated both primary and secondary contacts']
  },
  {
    id: 'task-005',
    title: 'Complete cybersecurity training',
    description:
      'Complete the mandatory cybersecurity awareness training module. This includes:\n• Phishing awareness quiz\n• Password security best practices\n• Data handling guidelines\n• Incident reporting procedures',
    status: 'confirmed',
    priority: 'high',
    assignedBy: 'Security Team',
    assignedAt: daysFromNow(-7),
    dueDate: daysFromNow(-3),
    completedAt: daysFromNow(-4),
    confirmedAt: daysFromNow(-2),
    relatedDocuments: ['doc-005'],
    notes: ['Completed with 95% score on quiz']
  },
  {
    id: 'task-006',
    title: 'Schedule knowledge transfer session',
    description:
      'Schedule and conduct knowledge transfer sessions with your replacement team members. Cover:\n• Current project status\n• Key contacts and relationships\n• Process documentation\n• Access credentials handover',
    status: 'overdue',
    priority: 'high',
    assignedBy: 'Team Lead',
    assignedAt: daysFromNow(-5),
    dueDate: daysFromNow(-2),
    relatedDocuments: ['doc-006'],
    notes: ['Waiting for replacement team to be finalized']
  }
];

export const mockDocuments = [
  {
    id: 'doc-001',
    filename: 'Employee_Handbook_2024.pdf',
    size: 2400000, // 2.4 MB
    uploadedAt: daysFromNow(-2),
    uploadedBy: 'HR Team',
    category: 'Policies',
    relatedTasks: ['task-001'],
    description: 'Updated employee handbook with new remote work policies and benefits information'
  },
  {
    id: 'doc-002',
    filename: 'Remote_Work_Policy_Update.pdf',
    size: 156000, // 156 KB
    uploadedAt: daysFromNow(-2),
    uploadedBy: 'HR Team',
    category: 'Policies',
    relatedTasks: ['task-001'],
    description: 'Detailed remote work policy changes effective immediately'
  },
  {
    id: 'doc-003',
    filename: 'IT_Equipment_Return_Checklist.pdf',
    size: 89000, // 89 KB
    uploadedAt: daysFromNow(-1),
    uploadedBy: 'IT Department',
    category: 'IT',
    relatedTasks: ['task-002'],
    description: 'Checklist for returning company equipment'
  },
  {
    id: 'doc-004',
    filename: 'Project_Documentation_Template.docx',
    size: 234000, // 234 KB
    uploadedAt: hoursFromNow(-4),
    uploadedBy: 'Project Manager',
    category: 'Templates',
    relatedTasks: ['task-003'],
    description: 'Template for final project documentation submission'
  },
  {
    id: 'doc-005',
    filename: 'Cybersecurity_Training_Materials.pdf',
    size: 1800000, // 1.8 MB
    uploadedAt: daysFromNow(-7),
    uploadedBy: 'Security Team',
    category: 'Training',
    relatedTasks: ['task-005'],
    description: 'Complete cybersecurity training materials and guidelines'
  },
  {
    id: 'doc-006',
    filename: 'Knowledge_Transfer_Template.docx',
    size: 167000, // 167 KB
    uploadedAt: daysFromNow(-5),
    uploadedBy: 'Team Lead',
    category: 'Templates',
    relatedTasks: ['task-006'],
    description: 'Template for documenting knowledge transfer sessions'
  }
];

export const mockNotifications = [
  {
    id: 'notif-001',
    type: 'task_assigned',
    title: 'New Task Assigned',
    content: 'Submit final project documentation',
    timestamp: hoursFromNow(-4),
    read: false,
    relatedId: 'task-003',
    from: 'Project Manager'
  },
  {
    id: 'notif-002',
    type: 'document_received',
    title: 'Document Received',
    content: 'Project_Documentation_Template.docx',
    timestamp: hoursFromNow(-4),
    read: false,
    relatedId: 'doc-004',
    from: 'Project Manager'
  },
  {
    id: 'notif-003',
    type: 'task_confirmed',
    title: 'Task Confirmed Complete',
    content: 'Complete cybersecurity training',
    timestamp: daysFromNow(-2),
    read: true,
    relatedId: 'task-005',
    from: 'Security Team'
  },
  {
    id: 'notif-004',
    type: 'document_received',
    title: 'Document Received',
    content: 'Employee_Handbook_2024.pdf',
    timestamp: daysFromNow(-2),
    read: true,
    relatedId: 'doc-001',
    from: 'HR Team'
  },
  {
    id: 'notif-005',
    type: 'task_attention',
    title: 'Task Requires Attention',
    content: 'Schedule knowledge transfer session - overdue',
    timestamp: hoursFromNow(-1),
    read: false,
    relatedId: 'task-006',
    from: 'System'
  },
  {
    id: 'notif-006',
    type: 'message',
    title: 'General Message',
    content: 'Welcome to the assignment management system. Please review your pending tasks.',
    timestamp: daysFromNow(-3),
    read: true,
    from: 'System'
  }
];

// Helper functions
export const getTasksByStatus = (status) => {
  return mockTasks.filter((task) => task.status === status);
};

export const getPendingTasks = () => {
  return mockTasks.filter(
    (task) =>
      task.status === 'assigned' || task.status === 'in_progress' || task.status === 'overdue'
  );
};

export const getUnreadNotifications = () => {
  return mockNotifications.filter((notif) => !notif.read);
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (date) => {
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0) return `In ${diffDays} days`;
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;

  return date.toLocaleDateString();
};

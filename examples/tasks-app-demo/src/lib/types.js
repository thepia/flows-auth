/**
 * @typedef {'assigned' | 'in_progress' | 'completed_pending' | 'confirmed' | 'overdue' | 'requires_attention'} TaskStatus
 * @typedef {'low' | 'medium' | 'high'} TaskPriority
 */

/**
 * @typedef {Object} Task
 * @property {string} id - Unique task identifier
 * @property {string} title - Task title
 * @property {string} description - Detailed description
 * @property {TaskStatus} status - Current task status
 * @property {TaskPriority} priority - Task priority level
 * @property {string} assignedBy - Who assigned the task (department/person)
 * @property {Date} assignedAt - When task was assigned
 * @property {Date} dueDate - When task is due
 * @property {Date} [completedAt] - When user marked complete
 * @property {Date} [confirmedAt] - When company confirmed completion
 * @property {string[]} relatedDocuments - Related document IDs
 * @property {string[]} notes - User notes/comments
 */

/**
 * @typedef {Object} Document
 * @property {string} id - Unique document identifier
 * @property {string} filename - Original filename
 * @property {number} size - File size in bytes
 * @property {Date} uploadedAt - When document was uploaded
 * @property {string} uploadedBy - Who uploaded (department/person)
 * @property {string} category - Document category
 * @property {string[]} relatedTasks - Related task IDs
 * @property {string} [description] - Optional description
 */

/**
 * @typedef {'task_assigned' | 'task_confirmed' | 'document_received' | 'message' | 'task_attention'} NotificationType
 */

/**
 * @typedef {Object} Notification
 * @property {string} id - Unique notification identifier
 * @property {NotificationType} type - Notification type
 * @property {string} title - Notification title
 * @property {string} content - Notification content
 * @property {Date} timestamp - When notification was created
 * @property {boolean} read - Whether user has read it
 * @property {string} [relatedId] - Related task or document ID
 * @property {string} [from] - Who sent the notification
 */

export { };
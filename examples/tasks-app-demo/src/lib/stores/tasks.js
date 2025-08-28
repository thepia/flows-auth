/**
 * Tasks Store - Local storage with service worker sync
 */

import { browser } from '$app/environment';
import { writable } from 'svelte/store';

// Task type definition for documentation
// Task: { uid, title, description?, completed, createdAt, updatedAt, syncStatus }

// Create reactive stores
export const tasks = writable([]);
export const syncStatus = writable({
  isOnline: true,
  lastSync: null,
  pendingCount: 0,
  syncing: false,
});

class TasksManager {
  constructor() {
    this.localDB = null;
    this.serviceWorker = null;
    this.isInitialized = false;
  }

  async init() {
    if (!browser || this.isInitialized) return;

    try {
      // Initialize local storage
      const { getLocalStorageDB } = await import('@thepia/flows-auth');
      this.localDB = getLocalStorageDB();
      await this.localDB.init();

      // Initialize service worker
      const { getServiceWorkerManager } = await import('@thepia/flows-auth');
      this.serviceWorker = getServiceWorkerManager();

      // Load tasks from local storage
      await this.loadTasks();

      // Set up sync status monitoring
      this.setupSyncMonitoring();

      this.isInitialized = true;
      console.log('[Tasks] Manager initialized');
    } catch (error) {
      console.error('[Tasks] Failed to initialize:', error);
      const { reportTaskError } = await import('../config/errorReporting.js');
      await reportTaskError('tasks.init', error, { context: 'TasksManager.init' });
    }
  }

  async loadTasks() {
    try {
      const workflows = await this.localDB.getAllWorkflows();
      const taskList = workflows
        .filter((w) => w.workflowId === 'tasks')
        .map((w) => ({
          uid: w.uid,
          title: w.data?.title || 'Untitled Task',
          description: w.data?.description || '',
          completed: w.data?.completed || false,
          createdAt: w.timestamp,
          updatedAt: w.lastModified,
          syncStatus: w.syncStatus,
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt);

      tasks.set(taskList);
    } catch (error) {
      console.error('[Tasks] Failed to load tasks:', error);
      const { reportTaskError } = await import('../config/errorReporting.js');
      await reportTaskError('tasks.load', error, { context: 'TasksManager.loadTasks' });
    }
  }

  async addTask(title, description = '') {
    if (!this.isInitialized) await this.init();

    const task = {
      uid: this.generateUID(),
      title: title.trim(),
      description: description.trim(),
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'pending',
    };

    try {
      // Store in local database
      await this.localDB.storeWorkflow({
        uid: task.uid,
        workflowId: 'tasks',
        timestamp: task.createdAt,
        version: '1.0.0',
        syncStatus: 'pending',
        data: {
          title: task.title,
          description: task.description,
          completed: task.completed,
        },
      });

      // Update store
      tasks.update((list) => [task, ...list]);

      // Request sync
      await this.requestSync();

      return task;
    } catch (error) {
      console.error('[Tasks] Failed to add task:', error);
      const { reportTaskError } = await import('../config/errorReporting.js');
      await reportTaskError('tasks.add', error, {
        context: 'TasksManager.addTask',
        taskTitle: title,
      });
      throw error;
    }
  }

  async updateTask(uid, updates) {
    if (!this.isInitialized) await this.init();

    try {
      const workflow = await this.localDB.getWorkflow(uid);
      if (!workflow) throw new Error('Task not found');

      const updatedData = {
        ...workflow.data,
        ...updates,
      };

      await this.localDB.storeWorkflow({
        ...workflow,
        data: updatedData,
        syncStatus: 'pending',
        lastModified: Date.now(),
      });

      // Update store
      tasks.update((list) =>
        list.map((task) =>
          task.uid === uid
            ? {
                ...task,
                ...updates,
                updatedAt: Date.now(),
                syncStatus: 'pending',
              }
            : task
        )
      );

      await this.requestSync();
    } catch (error) {
      console.error('[Tasks] Failed to update task:', error);
      const { reportTaskError } = await import('../config/errorReporting.js');
      await reportTaskError('tasks.update', error, {
        context: 'TasksManager.updateTask',
        taskUid: uid,
        updates: Object.keys(updates),
      });
      throw error;
    }
  }

  async deleteTask(uid) {
    if (!this.isInitialized) await this.init();

    try {
      await this.localDB.deleteWorkflow(uid);

      tasks.update((list) => list.filter((task) => task.uid !== uid));

      await this.requestSync();
    } catch (error) {
      console.error('[Tasks] Failed to delete task:', error);
      const { reportTaskError } = await import('../config/errorReporting.js');
      await reportTaskError('tasks.delete', error, {
        context: 'TasksManager.deleteTask',
        taskUid: uid,
      });
      throw error;
    }
  }

  async toggleTask(uid) {
    const taskList = await new Promise((resolve) => {
      const unsubscribe = tasks.subscribe((value) => {
        resolve(value);
        unsubscribe();
      });
    });

    const task = taskList.find((t) => t.uid === uid);
    if (task) {
      await this.updateTask(uid, { completed: !task.completed });
    }
  }

  async requestSync() {
    if (!this.serviceWorker) return;

    try {
      await this.serviceWorker.requestSync();
      this.updateSyncStatus();
    } catch (error) {
      console.error('[Tasks] Sync request failed:', error);
      const { reportSyncError } = await import('../config/errorReporting.js');
      await reportSyncError('sync.request', error, {
        context: 'TasksManager.requestSync',
      });
    }
  }

  async updateSyncStatus() {
    try {
      const pendingCount = await this.localDB.getPendingUploadCount();
      const metadata = await this.localDB.getSyncMetadata();

      syncStatus.update((status) => ({
        ...status,
        pendingCount,
        lastSync: metadata.lastSyncTimestamp,
        syncing: metadata.syncInProgress,
      }));
    } catch (error) {
      console.error('[Tasks] Failed to update sync status:', error);
      const { reportSyncError } = await import('../config/errorReporting.js');
      await reportSyncError('sync.status', error, {
        context: 'TasksManager.updateSyncStatus',
      });
    }
  }

  setupSyncMonitoring() {
    // Monitor online status
    if (browser) {
      window.addEventListener('online', () => {
        syncStatus.update((s) => ({ ...s, isOnline: true }));
        this.requestSync();
      });

      window.addEventListener('offline', () => {
        syncStatus.update((s) => ({ ...s, isOnline: false }));
      });

      // Listen for service worker sync events
      window.addEventListener('flows-auth:sync-complete', (_event) => {
        this.loadTasks();
        this.updateSyncStatus();
      });

      window.addEventListener('flows-auth:sync-error', async (event) => {
        console.error('[Tasks] Sync error:', event.detail);
        const { reportSyncError } = await import('../config/errorReporting.js');
        await reportSyncError('sync.background', event.detail, {
          context: 'ServiceWorker.syncError',
          eventType: 'flows-auth:sync-error',
        });
        this.updateSyncStatus();
      });
    }
  }

  generateUID() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Global tasks manager instance
const tasksManager = new TasksManager();

// Export functions for components to use
export const initTasks = () => tasksManager.init();
export const addTask = (title, description) => tasksManager.addTask(title, description);
export const updateTask = (uid, updates) => tasksManager.updateTask(uid, updates);
export const deleteTask = (uid) => tasksManager.deleteTask(uid);
export const toggleTask = (uid) => tasksManager.toggleTask(uid);
export const requestSync = () => tasksManager.requestSync();

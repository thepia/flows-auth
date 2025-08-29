/**
 * IndexedDB Local Storage Wrapper
 * Privacy-first local storage for workflow data
 * 
 * SPIKE: Experimental IndexedDB implementation for service worker sync
 */

export interface WorkflowRecord {
  uid: string;
  workflowId: string;
  timestamp: number;
  version: string;
  checksum?: string;
  recordingCount?: number;
  syncStatus: 'pending' | 'synced' | 'failed';
  syncError?: string;
  lastModified: number;
  data?: any; // Actual workflow data (kept local)
}

export interface SyncMetadata {
  lastSyncTimestamp: number;
  pendingUploads: number;
  syncInProgress: boolean;
}

export class LocalStorageDB {
  private db: IDBDatabase | null = null;
  private dbName = 'flows-auth-db';
  private version = 1;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    if (!('indexedDB' in window)) {
      throw new Error('IndexedDB not supported');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('[LocalStorage] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.setupSchema(db);
      };
    });
  }

  /**
   * Setup database schema
   */
  private setupSchema(db: IDBDatabase): void {
    // Workflows store
    if (!db.objectStoreNames.contains('workflows')) {
      const workflowStore = db.createObjectStore('workflows', { keyPath: 'uid' });
      workflowStore.createIndex('workflowId', 'workflowId', { unique: false });
      workflowStore.createIndex('timestamp', 'timestamp', { unique: false });
      workflowStore.createIndex('syncStatus', 'syncStatus', { unique: false });
      workflowStore.createIndex('lastModified', 'lastModified', { unique: false });
    }

    // Sync metadata store
    if (!db.objectStoreNames.contains('sync_metadata')) {
      db.createObjectStore('sync_metadata', { keyPath: 'id' });
    }

    console.log('[LocalStorage] Database schema created');
  }

  /**
   * Store workflow record
   */
  async storeWorkflow(workflow: Omit<WorkflowRecord, 'lastModified'>): Promise<void> {
    await this.ensureInitialized();

    const record: WorkflowRecord = {
      ...workflow,
      lastModified: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db?.transaction(['workflows'], 'readwrite');
      const store = transaction?.objectStore('workflows');
      if (!store) throw new Error('Failed to access workflows store');
      const request = store.put(record);

      request.onerror = () => reject(new Error('Failed to store workflow'));
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get workflow by UID
   */
  async getWorkflow(uid: string): Promise<WorkflowRecord | null> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db?.transaction(['workflows'], 'readonly');
      const store = transaction?.objectStore('workflows');
      if (!store) throw new Error('Failed to access workflows store');
      const request = store.get(uid);

      request.onerror = () => reject(new Error('Failed to get workflow'));
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  /**
   * Get workflows by sync status
   */
  async getWorkflowsByStatus(status: 'pending' | 'synced' | 'failed'): Promise<WorkflowRecord[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db?.transaction(['workflows'], 'readonly');
      const store = transaction?.objectStore('workflows');
      if (!store) throw new Error('Failed to access workflows store');
      const index = store.index('syncStatus');
      const request = index.getAll(status);

      request.onerror = () => reject(new Error('Failed to get workflows by status'));
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Get all workflows
   */
  async getAllWorkflows(): Promise<WorkflowRecord[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db?.transaction(['workflows'], 'readonly');
      const store = transaction?.objectStore('workflows');
      if (!store) throw new Error('Failed to access workflows store');
      const request = store.getAll();

      request.onerror = () => reject(new Error('Failed to get all workflows'));
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Update workflow sync status
   */
  async updateSyncStatus(uid: string, status: 'pending' | 'synced' | 'failed', error?: string): Promise<void> {
    await this.ensureInitialized();

    const workflow = await this.getWorkflow(uid);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    workflow.syncStatus = status;
    workflow.syncError = error;
    workflow.lastModified = Date.now();

    await this.storeWorkflow(workflow);
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(uid: string): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db?.transaction(['workflows'], 'readwrite');
      const store = transaction?.objectStore('workflows');
      if (!store) throw new Error('Failed to access workflows store');
      const request = store.delete(uid);

      request.onerror = () => reject(new Error('Failed to delete workflow'));
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get sync metadata
   */
  async getSyncMetadata(): Promise<SyncMetadata> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db?.transaction(['sync_metadata'], 'readonly');
      const store = transaction?.objectStore('sync_metadata');
      if (!store) throw new Error('Failed to access sync_metadata store');
      const request = store.get('sync');

      request.onerror = () => reject(new Error('Failed to get sync metadata'));
      request.onsuccess = () => {
        const result = request.result;
        resolve(result || {
          lastSyncTimestamp: 0,
          pendingUploads: 0,
          syncInProgress: false
        });
      };
    });
  }

  /**
   * Update sync metadata
   */
  async updateSyncMetadata(metadata: Partial<SyncMetadata>): Promise<void> {
    await this.ensureInitialized();

    const current = await this.getSyncMetadata();
    const updated = { ...current, ...metadata };

    return new Promise((resolve, reject) => {
      const transaction = this.db?.transaction(['sync_metadata'], 'readwrite');
      const store = transaction?.objectStore('sync_metadata');
      if (!store) throw new Error('Failed to access sync_metadata store');
      const request = store.put({ id: 'sync', ...updated });

      request.onerror = () => reject(new Error('Failed to update sync metadata'));
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get pending upload count
   */
  async getPendingUploadCount(): Promise<number> {
    const pendingWorkflows = await this.getWorkflowsByStatus('pending');
    return pendingWorkflows.length;
  }

  /**
   * Clear all data (for spike cleanup)
   */
  async clearAll(): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db?.transaction(['workflows', 'sync_metadata'], 'readwrite');

      const workflowStore = transaction?.objectStore('workflows');
      const metadataStore = transaction?.objectStore('sync_metadata');
      if (!workflowStore || !metadataStore) throw new Error('Failed to access required stores');

      const clearWorkflows = workflowStore.clear();
      const clearMetadata = metadataStore.clear();

      let completed = 0;
      const checkComplete = () => {
        completed++;
        if (completed === 2) {
          resolve();
        }
      };

      clearWorkflows.onerror = () => reject(new Error('Failed to clear workflows'));
      clearWorkflows.onsuccess = checkComplete;
      
      clearMetadata.onerror = () => reject(new Error('Failed to clear metadata'));
      clearMetadata.onsuccess = checkComplete;
    });
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
  }
}

/**
 * Global database instance
 */
let localStorageDB: LocalStorageDB | null = null;

/**
 * Get or create local storage database
 */
export function getLocalStorageDB(): LocalStorageDB {
  if (!localStorageDB) {
    localStorageDB = new LocalStorageDB();
  }
  return localStorageDB;
}

/**
 * Initialize local storage (call from app startup)
 */
export async function initLocalStorage(): Promise<void> {
  const db = getLocalStorageDB();
  await db.init();
}

/**
 * Cleanup local storage (for spike removal)
 */
export async function cleanupLocalStorage(): Promise<void> {
  if (localStorageDB) {
    await localStorageDB.clearAll();
    localStorageDB.close();
    localStorageDB = null;
  }
}
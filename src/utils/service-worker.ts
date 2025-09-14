/**
 * Service Worker Registration and Communication Utilities
 *
 * SPIKE: Experimental service worker integration
 */

export interface SyncStatus {
  pendingUploads: number;
  lastSync: number;
  isOnline: boolean;
}

export interface SyncResult {
  success: boolean;
  error?: string;
  synced?: number;
  timestamp?: number;
}

export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean;

  constructor() {
    this.isSupported = 'serviceWorker' in navigator;
  }

  /**
   * Register service worker
   */
  async register(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('[SW Manager] Service workers not supported');
      return false;
    }

    try {
      console.log('[SW Manager] Registering service worker');

      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[SW Manager] Service worker registered:', this.registration.scope);

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        console.log('[SW Manager] Service worker update found');
        this.handleUpdate();
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event);
      });

      return true;
    } catch (error) {
      console.error('[SW Manager] Service worker registration failed:', error);
      return false;
    }
  }

  /**
   * Unregister service worker (for easy cleanup during spike)
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return true;
    }

    try {
      const result = await this.registration.unregister();
      console.log('[SW Manager] Service worker unregistered');
      this.registration = null;
      return result;
    } catch (error) {
      console.error('[SW Manager] Service worker unregistration failed:', error);
      return false;
    }
  }

  /**
   * Request immediate sync
   */
  async requestSync(): Promise<SyncResult> {
    if (!this.registration) {
      return { success: false, error: 'Service worker not registered' };
    }

    try {
      // Try background sync first
      if ('sync' in window.ServiceWorkerRegistration.prototype) {
        await (this.registration as any).sync.register('workflow-sync');
        return { success: true };
      }

      // Fallback to direct message
      return await this.sendMessage('SYNC_NOW');
    } catch (error) {
      console.error('[SW Manager] Sync request failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus | null> {
    if (!this.registration) {
      return null;
    }

    try {
      const result = await this.sendMessage('GET_SYNC_STATUS');
      return result.success ? result.status : null;
    } catch (error) {
      console.error('[SW Manager] Failed to get sync status:', error);
      return null;
    }
  }

  /**
   * Clear service worker cache
   */
  async clearCache(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const result = await this.sendMessage('CLEAR_CACHE');
      return result.success;
    } catch (error) {
      console.error('[SW Manager] Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Check if service worker is active
   */
  isActive(): boolean {
    return !!(this.registration && this.registration.active);
  }

  /**
   * Send message to service worker
   */
  private async sendMessage(type: string, payload?: any): Promise<any> {
    if (!this.registration || !this.registration.active) {
      throw new Error('Service worker not active');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      // Timeout after 10 seconds
      const timeout = setTimeout(() => {
        reject(new Error('Service worker message timeout'));
      }, 10000);

      messageChannel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        resolve(event.data);
      };

      if (this.registration?.active) {
        this.registration.active.postMessage({ type, payload }, [messageChannel.port2]);
      } else {
        reject(new Error('Service worker not active'));
      }
    });
  }

  /**
   * Handle service worker updates
   */
  private handleUpdate(): void {
    const newWorker = this.registration?.installing;

    if (newWorker) {
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[SW Manager] New service worker available');
          // Notify user about update
          this.dispatchEvent('sw-update-available');
        }
      });
    }
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, payload } = event.data;

    console.log('[SW Manager] Message from service worker:', type, payload);

    switch (type) {
      case 'SYNC_COMPLETE':
        this.dispatchEvent('sync-complete', payload);
        break;
      case 'SYNC_ERROR':
        this.dispatchEvent('sync-error', payload);
        break;
      default:
        console.log('[SW Manager] Unknown message type:', type);
    }
  }

  /**
   * Dispatch custom events
   */
  private dispatchEvent(type: string, detail?: any): void {
    const event = new CustomEvent(`flows-auth:${type}`, { detail });
    window.dispatchEvent(event);
  }
}

/**
 * Global service worker manager instance
 */
let serviceWorkerManager: ServiceWorkerManager | null = null;

/**
 * Get or create service worker manager
 */
export function getServiceWorkerManager(): ServiceWorkerManager {
  if (!serviceWorkerManager) {
    serviceWorkerManager = new ServiceWorkerManager();
  }
  return serviceWorkerManager;
}

/**
 * Auto-register service worker (call from app initialization)
 */
export async function initServiceWorker(): Promise<boolean> {
  const manager = getServiceWorkerManager();
  return await manager.register();
}

/**
 * Cleanup service worker (for easy spike removal)
 */
export async function cleanupServiceWorker(): Promise<boolean> {
  const manager = getServiceWorkerManager();
  return await manager.unregister();
}

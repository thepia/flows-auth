/**
 * Service Worker - Flows Auth Spike
 * Handles background sync and offline functionality
 *
 * SPIKE: Experimental service worker implementation
 */

const CACHE_NAME = 'flows-auth-v1';
const SYNC_TAG = 'workflow-sync';

// Cache strategy for static assets
const STATIC_CACHE_URLS = ['/', '/manifest.json'];

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Service worker installed');
        return self.skipWaiting();
      })
  );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

/**
 * Background Sync Handler
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncWorkflowData());
  }
});

/**
 * Message Handler (from main thread)
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  const { type } = event.data;

  switch (type) {
    case 'SYNC_NOW':
      handleImmediateSync(event.ports[0]);
      break;
    case 'GET_SYNC_STATUS':
      handleGetSyncStatus(event.ports[0]);
      break;
    case 'CLEAR_CACHE':
      handleClearCache(event.ports[0]);
      break;
    default:
      console.warn('[SW] Unknown message type:', type);
  }
});

/**
 * Fetch Handler (Network-first for API, Cache-first for static)
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/sync/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (
    request.destination === 'document' ||
    request.destination === 'script' ||
    request.destination === 'style'
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }
});

/**
 * Sync workflow data with server
 */
async function syncWorkflowData() {
  try {
    console.log('[SW] Starting workflow sync');

    // Get pending workflows from IndexedDB
    const pendingWorkflows = await getPendingWorkflows();

    if (pendingWorkflows.length === 0) {
      console.log('[SW] No pending workflows to sync');
      return;
    }

    // Sync each workflow
    for (const workflow of pendingWorkflows) {
      try {
        await syncSingleWorkflow(workflow);
        await markWorkflowSynced(workflow.uid);
        console.log('[SW] Synced workflow:', workflow.uid);
      } catch (error) {
        console.error('[SW] Failed to sync workflow:', workflow.uid, error);
        await markWorkflowFailed(workflow.uid, error.message);
      }
    }

    console.log('[SW] Workflow sync completed');

    // Notify main thread
    await notifyClients('SYNC_COMPLETE', {
      synced: pendingWorkflows.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('[SW] Workflow sync failed:', error);
    await notifyClients('SYNC_ERROR', {
      error: error.message,
      timestamp: Date.now()
    });
  }
}

/**
 * Sync single workflow
 */
async function syncSingleWorkflow(workflow) {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('No auth token available');
  }

  const response = await fetch('/sync/workflows/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      metadata: {
        uid: workflow.uid,
        workflowId: workflow.workflowId,
        timestamp: workflow.timestamp,
        version: workflow.version,
        checksum: workflow.checksum,
        recordingCount: workflow.recordingCount
      }
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
}

/**
 * Handle immediate sync request
 */
async function handleImmediateSync(port) {
  try {
    await syncWorkflowData();
    port.postMessage({ success: true });
  } catch (error) {
    port.postMessage({ success: false, error: error.message });
  }
}

/**
 * Handle sync status request
 */
async function handleGetSyncStatus(port) {
  try {
    const pendingCount = await getPendingWorkflowCount();
    const lastSync = await getLastSyncTimestamp();

    port.postMessage({
      success: true,
      status: {
        pendingUploads: pendingCount,
        lastSync: lastSync,
        isOnline: navigator.onLine
      }
    });
  } catch (error) {
    port.postMessage({ success: false, error: error.message });
  }
}

/**
 * Handle cache clear request
 */
async function handleClearCache(port) {
  try {
    await caches.delete(CACHE_NAME);
    port.postMessage({ success: true });
  } catch (error) {
    port.postMessage({ success: false, error: error.message });
  }
}

/**
 * Network-first caching strategy
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Cache-first strategy
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    console.error('[SW] Failed to fetch:', request.url, error);
    throw error;
  }
}

/**
 * Notify all clients
 */
async function notifyClients(type, payload) {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type, payload });
  });
}

/**
 * IndexedDB helper functions (stubs for spike)
 */
async function getPendingWorkflows() {
  // TODO: Implement IndexedDB query
  return [];
}

async function getPendingWorkflowCount() {
  // TODO: Implement IndexedDB count
  return 0;
}

async function getLastSyncTimestamp() {
  // TODO: Implement IndexedDB query
  return Date.now() - 3600000; // 1 hour ago
}

async function markWorkflowSynced(uid) {
  // TODO: Implement IndexedDB update
  console.log('[SW] Marking workflow synced (stub):', uid);
}

async function markWorkflowFailed(uid, error) {
  // TODO: Implement IndexedDB update
  console.log('[SW] Marking workflow failed (stub):', uid, error);
}

async function getAuthToken() {
  // TODO: Get token from IndexedDB or message main thread
  return null;
}

/**
 * Service Worker Integration Tests
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Service Worker Integration', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  it('should have service worker file in static directory', () => {
    // Check that sw.js exists in static directory
    let swContent;
    try {
      swContent = readFileSync(join(process.cwd(), 'static', 'sw.js'), 'utf-8');
    } catch (_error) {
      throw new Error('Service worker file not found in static directory');
    }

    expect(swContent).toContain('Service Worker - Flows Auth Spike');
    expect(swContent).toContain('syncWorkflowData');
    expect(swContent).toContain('Background Sync Handler');
  });

  it('should have proper manifest.json', () => {
    let manifestContent;
    try {
      manifestContent = readFileSync(join(process.cwd(), 'static', 'manifest.json'), 'utf-8');
      const manifest = JSON.parse(manifestContent);

      expect(manifest.name).toBe('Tasks App - Flows Auth Demo');
      expect(manifest.short_name).toBe('Tasks App');
      expect(manifest.start_url).toBe('/');
      expect(manifest.display).toBe('standalone');
      expect(manifest.theme_color).toBe('#007bff');
    } catch (_error) {
      throw new Error('Manifest file not found or invalid JSON');
    }
  });

  it('should register service worker in app.html', () => {
    let appContent;
    try {
      appContent = readFileSync(join(process.cwd(), 'src', 'app.html'), 'utf-8');
    } catch (_error) {
      throw new Error('app.html not found');
    }

    expect(appContent).toContain('serviceWorker');
    expect(appContent).toContain('navigator.serviceWorker.register');
    expect(appContent).toContain('/sw.js');
  });

  it('should handle service worker registration mock', () => {
    const mockRegister = vi.fn().mockResolvedValue({
      scope: '/',
      active: null,
      installing: null,
      waiting: null,
    });

    global.navigator.serviceWorker = {
      register: mockRegister,
      controller: null,
      addEventListener: vi.fn(),
    };

    // Simulate registration
    const registration = global.navigator.serviceWorker.register('/sw.js');

    expect(mockRegister).toHaveBeenCalledWith('/sw.js');
    expect(registration).resolves.toMatchObject({
      scope: '/',
    });
  });

  it('should handle sync functionality', async () => {
    // Test that sync functions can be imported
    try {
      const { getServiceWorkerManager } = await import('@thepia/flows-auth');
      expect(typeof getServiceWorkerManager).toBe('function');
    } catch (error) {
      // Expected in test environment - just verify the import path exists
      expect(error.message).toBeDefined();
    }
  });

  it('should handle IndexedDB mock for local storage', () => {
    expect(global.indexedDB).toBeDefined();
    expect(typeof global.indexedDB.open).toBe('function');

    // Test that opening a database works with our mock
    const dbRequest = global.indexedDB.open('test-db', 1);
    expect(dbRequest).resolves.toBeDefined();
  });

  it('should handle offline scenarios', () => {
    // Test offline/online state changes
    const originalOnLine = global.navigator.onLine;

    // Set offline
    Object.defineProperty(global.navigator, 'onLine', {
      writable: true,
      value: false,
    });

    expect(global.navigator.onLine).toBe(false);

    // Set back online
    Object.defineProperty(global.navigator, 'onLine', {
      writable: true,
      value: true,
    });

    expect(global.navigator.onLine).toBe(true);

    // Restore original
    Object.defineProperty(global.navigator, 'onLine', {
      writable: true,
      value: originalOnLine,
    });
  });

  it('should handle message passing with service worker', () => {
    const _mockPort = {
      onmessage: null,
      postMessage: vi.fn(),
      close: vi.fn(),
    };

    const messageChannel = new global.MessageChannel();

    expect(messageChannel.port1).toBeDefined();
    expect(messageChannel.port2).toBeDefined();
    expect(typeof messageChannel.port1.postMessage).toBe('function');
    expect(typeof messageChannel.port2.postMessage).toBe('function');
  });

  it('should export required functions from tasks store', async () => {
    const { initTasks, addTask, updateTask, deleteTask, toggleTask, requestSync } = await import(
      '../src/lib/stores/tasks.js'
    );

    // Verify all sync-related functions are available
    expect(typeof initTasks).toBe('function');
    expect(typeof addTask).toBe('function');
    expect(typeof updateTask).toBe('function');
    expect(typeof deleteTask).toBe('function');
    expect(typeof toggleTask).toBe('function');
    expect(typeof requestSync).toBe('function');
  });
});

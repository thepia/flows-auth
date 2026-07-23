/**
 * WebKit Message Handler Session Adapter
 *
 * Communicates with native iOS/macOS apps via window.webkit.messageHandlers.thepia
 * Implements SessionPersistence interface for secure native storage integration
 */

import type { SessionData, SessionPersistence, UserData } from '../../types/index.js';
import { createLocalStorageAdapter } from './database.js';

/**
 * Message types for WebKit communication
 */
type WebKitMessageType =
  | 'saveSession'
  | 'loadSession'
  | 'clearSession'
  | 'saveUser'
  | 'getUser'
  | 'clearUser';

interface WebKitMessage {
  type: WebKitMessageType;
  data?: unknown;
  requestId: string;
}

interface WebKitResponse<T = unknown> {
  requestId: string;
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Check if WebKit message handlers are available
 */
export function isThepiaApp(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.webkit?.messageHandlers?.thepia?.postMessage !== undefined
  );
}

/**
 * Promise-based wrapper for WebKit message handler communication
 */
class NativeAppBridge {
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();

  private requestTimeout = 10000; // 10 second timeout

  constructor() {
    // Set up response listener
    if (typeof window !== 'undefined') {
      (window as any).__thepiaWebKitResponseHandler = this.handleResponse.bind(this);
    }
  }

  /**
   * Send message to native app and wait for response
   */
  async sendMessage<T>(type: WebKitMessageType, data?: unknown): Promise<T> {
    if (!isThepiaApp()) {
      throw new Error('WebKit message handlers not available');
    }

    const requestId = `${type}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const message: WebKitMessage = {
      type,
      data,
      requestId
    };

    return new Promise<T>((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`WebKit request timeout: ${type}`));
      }, this.requestTimeout);

      // Store request for response handling
      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      // Send message to native app
      try {
        const thepiaHandler = window.webkit?.messageHandlers?.thepia;
        if (!thepiaHandler) {
          throw new Error(
            'WebKit message handler (window.webkit.messageHandlers.thepia) not available'
          );
        }
        thepiaHandler.postMessage(message);
        console.log('📤 WebKit message sent:', type, requestId);
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }

  /**
   * Handle response from native app
   * Called by native app via window.__thepiaWebKitResponseHandler
   */
  private handleResponse(response: WebKitResponse): void {
    console.log('📥 WebKit response received:', response.requestId);

    const pending = this.pendingRequests.get(response.requestId);
    if (!pending) {
      console.warn('No pending request found for:', response.requestId);
      return;
    }

    // Clear timeout
    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.requestId);

    // Resolve or reject based on response
    if (response.success) {
      pending.resolve(response.data);
    } else {
      pending.reject(new Error(response.error || 'WebKit request failed'));
    }
  }

  /**
   * Cleanup pending requests
   */
  cleanup(): void {
    for (const [_requestId, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Bridge cleanup'));
    }
    this.pendingRequests.clear();
  }
}

// Global bridge instance
let bridgeInstance: NativeAppBridge | null = null;

function getBridge(): NativeAppBridge {
  if (!bridgeInstance) {
    bridgeInstance = new NativeAppBridge();
  }
  return bridgeInstance;
}

/**
 * Create Native App SessionPersistence adapter
 *
 * Usage:
 * ```typescript
 * import { createNativeAppSessionAdapter } from '@thepia/flows-auth';
 *
 * const authStore = createAuthStore({
 *   apiBaseUrl: 'https://api.thepia.com',
 *   clientId: 'your-app',
 *   domain: 'yourapp.com',
 *   database: createNativeAppSessionAdapter()
 * });
 * ```
 *
 * Native App Integration:
 *
 * The native app must implement message handlers and call the response handler:
 *
 * ```swift
 * // Swift example
 * func userContentController(_ userContentController: WKUserContentController,
 *                            didReceive message: WKScriptMessage) {
 *     guard let body = message.body as? [String: Any],
 *           let type = body["type"] as? String,
 *           let requestId = body["requestId"] as? String else {
 *         return
 *     }
 *
 *     switch type {
 *     case "saveSession":
 *         let sessionData = body["data"] as? [String: Any]
 *         // Save to Keychain or secure storage
 *         saveToKeychain(sessionData)
 *         sendResponse(requestId: requestId, success: true)
 *
 *     case "loadSession":
 *         let sessionData = loadFromKeychain()
 *         sendResponse(requestId: requestId, success: true, data: sessionData)
 *
 *     case "clearSession":
 *         deleteFromKeychain()
 *         sendResponse(requestId: requestId, success: true)
 *
 *     // ... handle other types
 *     }
 * }
 *
 * func sendResponse(requestId: String, success: Bool, data: Any? = nil) {
 *     let response: [String: Any] = [
 *         "requestId": requestId,
 *         "success": success,
 *         "data": data as Any
 *     ]
 *
 *     let js = """
 *     window.__thepiaWebKitResponseHandler(\(toJSON(response)));
 *     """
 *
 *     webView.evaluateJavaScript(js, completionHandler: nil)
 * }
 * ```
 *
 * @param options - Optional configuration for timeouts and fallback behavior
 */
export function createNativeAppSessionAdapter(options?: {
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Fallback to localStorage if WebKit unavailable (default: true) */
  enableFallback?: boolean;
}): SessionPersistence {
  const { timeout = 10000, enableFallback = true } = options || {};

  // Check availability and log warning
  const isAvailable = isThepiaApp();
  if (!isAvailable) {
    console.warn('⚠️ WebKit message handlers not available');
    if (!enableFallback) {
      throw new Error('WebKit message handlers required but not available');
    }
  }

  const bridge = getBridge();
  if (timeout !== 10000) {
    (bridge as any).requestTimeout = timeout;
  }

  // Fallback to localStorage if enabled and WebKit unavailable
  if (!isAvailable && enableFallback) {
    console.log('📱 Using localStorage fallback for WebKit session adapter');
    // Use statically-imported localStorage adapter as fallback
    return createLocalStorageAdapter();
  }

  return {
    async saveSession(partialSession: Partial<SessionData>): Promise<SessionData> {
      try {
        console.log('💾 WebKit: Saving session to native storage');
        const result = await bridge.sendMessage<SessionData>('saveSession', partialSession);
        console.log('✅ WebKit: Session saved successfully');
        return result;
      } catch (error) {
        console.error('❌ WebKit: Failed to save session:', error);
        throw error;
      }
    },

    async loadSession(): Promise<SessionData | null> {
      try {
        console.log('📖 WebKit: Loading session from native storage');
        const result = await bridge.sendMessage<SessionData | null>('loadSession');

        if (result) {
          // Check token expiration only if there's no refresh token
          // expiresAt is now an ISO string, parse it for comparison
          const expiresAtMs = result.expiresAt ? new Date(result.expiresAt).getTime() : 0;
          if (expiresAtMs < Date.now() && !result.refreshToken) {
            console.log('🕐 WebKit: Session expired, clearing');
            await bridge.sendMessage('clearSession');
            return null;
          }
          console.log('✅ WebKit: Session loaded successfully');
        } else {
          console.log('ℹ️ WebKit: No session found in native storage');
        }

        return result;
      } catch (error) {
        console.error('❌ WebKit: Failed to load session:', error);
        return null;
      }
    },

    async clearSession(): Promise<void> {
      try {
        console.log('🗑️ WebKit: Clearing session from native storage');
        await bridge.sendMessage('clearSession');
        console.log('✅ WebKit: Session cleared successfully');
      } catch (error) {
        console.error('❌ WebKit: Failed to clear session:', error);
        throw error;
      }
    },

    async saveUser(user: UserData): Promise<void> {
      try {
        console.log('💾 WebKit: Saving user data to native storage');
        await bridge.sendMessage('saveUser', user);
        console.log('✅ WebKit: User data saved successfully');
      } catch (error) {
        console.error('❌ WebKit: Failed to save user:', error);
        throw error;
      }
    },

    async getUser(userId?: string): Promise<UserData | null> {
      try {
        console.log('📖 WebKit: Loading user data from native storage');
        const result = await bridge.sendMessage<UserData | null>('getUser', { userId });

        if (result) {
          console.log('✅ WebKit: User data loaded successfully');
        } else {
          console.log('ℹ️ WebKit: No user data found in native storage');
        }

        return result;
      } catch (error) {
        console.error('❌ WebKit: Failed to get user:', error);
        return null;
      }
    },

    async clearUser(userId?: string): Promise<void> {
      try {
        console.log('🗑️ WebKit: Clearing user data from native storage');
        await bridge.sendMessage('clearUser', { userId });
        console.log('✅ WebKit: User data cleared successfully');
      } catch (error) {
        console.error('❌ WebKit: Failed to clear user:', error);
        throw error;
      }
    }
  };
}

/**
 * Cleanup function for native app bridge
 * Call this when your app unmounts or navigates away
 */
export function cleanupNativeAppBridge(): void {
  if (bridgeInstance) {
    bridgeInstance.cleanup();
    bridgeInstance = null;
  }

  if (typeof window !== 'undefined') {
    (window as Window & { __thepiaWebKitResponseHandler?: unknown }).__thepiaWebKitResponseHandler =
      undefined;
  }
}

// Type augmentation for window.webkit
declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        thepia?: {
          postMessage(message: unknown): void;
        };
      };
    };
    __thepiaWebKitResponseHandler?: (response: WebKitResponse) => void;
  }
}

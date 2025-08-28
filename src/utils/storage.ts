/**
 * Storage utilities for auth library
 */

// Storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'thepia_auth_access_token',
  REFRESH_TOKEN: 'thepia_auth_refresh_token',
  EXPIRES_AT: 'thepia_auth_expires_at',
  USER: 'thepia_auth_user',
  PREFERENCES: 'thepia_auth_preferences',
} as const;

/**
 * Check if we're in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * Safely get item from localStorage
 */
export function getStorageItem(key: string): string | null {
  if (!isBrowser()) return null;

  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('Failed to read from localStorage:', error);
    return null;
  }
}

/**
 * Safely set item in localStorage
 */
export function setStorageItem(key: string, value: string): boolean {
  if (!isBrowser()) return false;

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn('Failed to write to localStorage:', error);
    return false;
  }
}

/**
 * Safely remove item from localStorage
 */
export function removeStorageItem(key: string): boolean {
  if (!isBrowser()) return false;

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn('Failed to remove from localStorage:', error);
    return false;
  }
}

/**
 * Clear all auth-related storage
 */
export function clearAuthStorage(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    removeStorageItem(key);
  });
}

/**
 * Get stored JSON object
 */
export function getStorageJSON<T>(key: string): T | null {
  const value = getStorageItem(key);
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Failed to parse JSON from storage:', error);
    return null;
  }
}

/**
 * Set JSON object in storage
 */
export function setStorageJSON(key: string, value: any): boolean {
  try {
    const jsonString = JSON.stringify(value);
    return setStorageItem(key, jsonString);
  } catch (error) {
    console.warn('Failed to stringify JSON for storage:', error);
    return false;
  }
}

/**
 * Check if storage is available and working
 */
export function isStorageAvailable(): boolean {
  if (!isBrowser()) return false;

  try {
    const testKey = '__thepia_storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get storage size in bytes (approximate)
 */
export function getStorageSize(): number {
  if (!isBrowser()) return 0;

  let total = 0;
  for (const key in localStorage) {
    if (Object.hasOwn(localStorage, key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total;
}

/**
 * Storage event listener for cross-tab sync
 */
export function onStorageChange(
  callback: (key: string, newValue: string | null, oldValue: string | null) => void
): () => void {
  if (!isBrowser()) return () => {};

  const handler = (event: StorageEvent) => {
    if (event.storageArea === localStorage && event.key) {
      callback(event.key, event.newValue, event.oldValue);
    }
  };

  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener('storage', handler);
  };
}

/**
 * Auth-specific storage helpers
 */
export const authStorage = {
  getAccessToken: () => getStorageItem(STORAGE_KEYS.ACCESS_TOKEN),
  setAccessToken: (token: string) => setStorageItem(STORAGE_KEYS.ACCESS_TOKEN, token),
  removeAccessToken: () => removeStorageItem(STORAGE_KEYS.ACCESS_TOKEN),

  getRefreshToken: () => getStorageItem(STORAGE_KEYS.REFRESH_TOKEN),
  setRefreshToken: (token: string) => setStorageItem(STORAGE_KEYS.REFRESH_TOKEN, token),
  removeRefreshToken: () => removeStorageItem(STORAGE_KEYS.REFRESH_TOKEN),

  getExpiresAt: () => {
    const value = getStorageItem(STORAGE_KEYS.EXPIRES_AT);
    return value ? parseInt(value) : null;
  },
  setExpiresAt: (timestamp: number) =>
    setStorageItem(STORAGE_KEYS.EXPIRES_AT, timestamp.toString()),
  removeExpiresAt: () => removeStorageItem(STORAGE_KEYS.EXPIRES_AT),

  getUser: () => getStorageJSON(STORAGE_KEYS.USER),
  setUser: (user: any) => setStorageJSON(STORAGE_KEYS.USER, user),
  removeUser: () => removeStorageItem(STORAGE_KEYS.USER),

  getPreferences: () => getStorageJSON(STORAGE_KEYS.PREFERENCES) || {},
  setPreferences: (prefs: any) => setStorageJSON(STORAGE_KEYS.PREFERENCES, prefs),

  clear: clearAuthStorage,
};

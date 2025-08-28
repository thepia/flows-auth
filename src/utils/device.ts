/**
 * Device detection utilities for auth library
 */

/**
 * Check if we're in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if we're on a mobile device
 */
export function isMobile(): boolean {
  if (!isBrowser()) return false;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Check if we're on iOS
 */
export function isIOS(): boolean {
  if (!isBrowser()) return false;

  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Check if we're on Android
 */
export function isAndroid(): boolean {
  if (!isBrowser()) return false;

  return /Android/.test(navigator.userAgent);
}

/**
 * Check if we're on macOS
 */
export function isMacOS(): boolean {
  if (!isBrowser()) return false;

  return /Mac/.test(navigator.userAgent) && !isIOS();
}

/**
 * Check if we're on Windows
 */
export function isWindows(): boolean {
  if (!isBrowser()) return false;

  return /Win/.test(navigator.userAgent);
}

/**
 * Check if we're on Linux
 */
export function isLinux(): boolean {
  if (!isBrowser()) return false;

  return /Linux/.test(navigator.userAgent) && !isAndroid();
}

/**
 * Get device type
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function getDeviceType(): DeviceType {
  if (!isBrowser()) return 'desktop';

  const userAgent = navigator.userAgent;

  if (/iPad/.test(userAgent) || (/Android/.test(userAgent) && !/Mobile/.test(userAgent))) {
    return 'tablet';
  }

  if (isMobile()) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Get operating system
 */
export type OperatingSystem = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'unknown';

export function getOperatingSystem(): OperatingSystem {
  if (!isBrowser()) return 'unknown';

  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  if (isMacOS()) return 'macos';
  if (isWindows()) return 'windows';
  if (isLinux()) return 'linux';

  return 'unknown';
}

/**
 * Get browser name
 */
export type BrowserName = 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'unknown';

export function getBrowserName(): BrowserName {
  if (!isBrowser()) return 'unknown';

  const userAgent = navigator.userAgent;

  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    return 'chrome';
  }
  if (userAgent.includes('Firefox')) {
    return 'firefox';
  }
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    return 'safari';
  }
  if (userAgent.includes('Edg')) {
    return 'edge';
  }
  if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    return 'opera';
  }

  return 'unknown';
}

/**
 * Check if touch is supported
 */
export function isTouchDevice(): boolean {
  if (!isBrowser()) return false;

  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

/**
 * Get device pixel ratio
 */
export function getDevicePixelRatio(): number {
  if (!isBrowser()) return 1;

  return window.devicePixelRatio || 1;
}

/**
 * Check if device is in standalone mode (PWA)
 */
export function isStandalone(): boolean {
  if (!isBrowser()) return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Get screen size category
 */
export type ScreenSize = 'small' | 'medium' | 'large' | 'xlarge';

export function getScreenSize(): ScreenSize {
  if (!isBrowser()) return 'large';

  const width = window.innerWidth;

  if (width < 640) return 'small';
  if (width < 1024) return 'medium';
  if (width < 1440) return 'large';
  return 'xlarge';
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  if (!isBrowser()) return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if dark mode is preferred
 */
export function prefersDarkMode(): boolean {
  if (!isBrowser()) return false;

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Get device information object
 */
export interface DeviceInfo {
  type: DeviceType;
  os: OperatingSystem;
  browser: BrowserName;
  isMobile: boolean;
  isTouch: boolean;
  isStandalone: boolean;
  screenSize: ScreenSize;
  pixelRatio: number;
  prefersReducedMotion: boolean;
  prefersDarkMode: boolean;
}

export function getDeviceInfo(): DeviceInfo {
  return {
    type: getDeviceType(),
    os: getOperatingSystem(),
    browser: getBrowserName(),
    isMobile: isMobile(),
    isTouch: isTouchDevice(),
    isStandalone: isStandalone(),
    screenSize: getScreenSize(),
    pixelRatio: getDevicePixelRatio(),
    prefersReducedMotion: prefersReducedMotion(),
    prefersDarkMode: prefersDarkMode(),
  };
}

/**
 * Generate device-specific passkey instructions
 */
export function getPasskeyInstructions(): string {
  const os = getOperatingSystem();
  const deviceType = getDeviceType();

  switch (os) {
    case 'ios':
      return deviceType === 'mobile'
        ? 'Use Face ID, Touch ID, or your device passcode'
        : 'Use Touch ID or enter your device passcode';

    case 'android':
      return 'Use your fingerprint, face unlock, or screen lock';

    case 'macos':
      return 'Use Touch ID or enter your Mac password';

    case 'windows':
      return 'Use Windows Hello, PIN, or security key';

    default:
      return 'Use your biometric authentication or security key';
  }
}

/**
 * Generate a user-friendly device name for passkey registration
 */
export function generateDeviceName(): string {
  const os = getOperatingSystem();
  const deviceType = getDeviceType();
  const browser = getBrowserName();

  let deviceName = '';

  // Operating system part
  switch (os) {
    case 'ios':
      deviceName = deviceType === 'tablet' ? 'iPad' : 'iPhone';
      break;
    case 'android':
      deviceName = deviceType === 'tablet' ? 'Android Tablet' : 'Android Phone';
      break;
    case 'macos':
      deviceName = 'Mac';
      break;
    case 'windows':
      deviceName = 'Windows PC';
      break;
    case 'linux':
      deviceName = 'Linux Device';
      break;
    default:
      deviceName = deviceType === 'mobile' ? 'Mobile Device' : 'Computer';
  }

  // Add browser if it's distinctive
  if (browser !== 'unknown' && browser !== 'chrome') {
    const browserNames = {
      firefox: 'Firefox',
      safari: 'Safari',
      edge: 'Edge',
      opera: 'Opera',
    };
    deviceName += ` (${browserNames[browser] || browser})`;
  }

  return deviceName;
}

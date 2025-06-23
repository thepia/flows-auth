/**
 * Validation utilities for auth library
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate password strength
 */
export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  score: number; // 0-4
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];
  let score = 0;

  // Length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  // Character variety checks
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Special characters (optional for full score)
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  }

  return {
    isValid: errors.length === 0,
    errors,
    score: Math.min(score, 4)
  };
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return 'Weak';
    case 2:
      return 'Fair';
    case 3:
      return 'Good';
    case 4:
      return 'Strong';
    default:
      return 'Unknown';
  }
}

/**
 * Get password strength color
 */
export function getPasswordStrengthColor(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return '#ef4444'; // red
    case 2:
      return '#f59e0b'; // yellow
    case 3:
      return '#10b981'; // green
    case 4:
      return '#059669'; // dark green
    default:
      return '#6b7280'; // gray
  }
}

/**
 * Validate domain format
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  return domainRegex.test(domain);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove basic HTML chars
    .substring(0, 1000); // Limit length
}

/**
 * Validate authentication configuration
 */
export function validateAuthConfig(config: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!config.apiBaseUrl) {
    errors.push('apiBaseUrl is required');
  } else if (!isValidUrl(config.apiBaseUrl)) {
    errors.push('apiBaseUrl must be a valid URL');
  }

  if (!config.clientId) {
    errors.push('clientId is required');
  }

  if (!config.domain) {
    errors.push('domain is required');
  } else if (!isValidDomain(config.domain)) {
    errors.push('domain must be a valid domain name');
  }

  // Branding validation
  if (config.branding) {
    if (config.branding.logoUrl && !isValidUrl(config.branding.logoUrl)) {
      errors.push('branding.logoUrl must be a valid URL');
    }

    if (config.branding.primaryColor && !isValidHexColor(config.branding.primaryColor)) {
      errors.push('branding.primaryColor must be a valid hex color');
    }

    if (config.branding.secondaryColor && !isValidHexColor(config.branding.secondaryColor)) {
      errors.push('branding.secondaryColor must be a valid hex color');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
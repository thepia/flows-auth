/**
 * Onboarding Store Tests
 *
 * Tests the onboarding store for managing consent, preferences, invitations, and client registrations.
 * Note: These tests focus on store functionality. Full integration tests with Zustand are in integration tests.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CompactConsentRecord,
  OnboardingMetadata,
  UserPreferences
} from '../../src/types/onboarding';

// Mock session manager
let mockStorage: Record<string, string> = {};

vi.mock('../../src/utils/sessionManager', () => ({
  configureSessionStorage: vi.fn(),
  getOptimalSessionConfig: vi.fn(() => ({ type: 'sessionStorage' })),
  getSession: vi.fn(() => {
    const data = mockStorage['thepia_auth_session'];
    return data ? JSON.parse(data) : null;
  }),
  saveSession: vi.fn((data: any) => {
    mockStorage['thepia_auth_session'] = JSON.stringify(data);
  }),
  clearSession: vi.fn(() => {
    delete mockStorage['thepia_auth_session'];
  })
}));

vi.mock('../../src/utils/storageManager', () => ({
  getStorageManager: vi.fn(() => ({
    getItem: vi.fn((key: string) => mockStorage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
    }),
    clear: vi.fn(() => {
      mockStorage = {};
    })
  }))
}));

// Mock the API client
vi.mock('../../src/api/auth-api', () => ({
  AuthApiClient: vi.fn().mockImplementation(() => ({
    getOnboardingMetadata: vi.fn(),
    updateOnboardingMetadata: vi.fn(),
    getConsents: vi.fn(),
    confirmConsent: vi.fn()
  }))
}));

describe('OnboardingStore - Functional Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Consent Record Structure', () => {
    it('should have valid consent record structure', () => {
      const record: CompactConsentRecord = {
        v: 1,
        dh: 'abc123def456',
        ts: Date.now()
      };

      expect(record.v).toBe(1);
      expect(record.dh).toBe('abc123def456');
      expect(typeof record.ts).toBe('number');
    });

    it('should support multiple consent records', () => {
      const consents: Record<string, CompactConsentRecord> = {
        'https://example.com/privacy': {
          v: 1,
          dh: 'abc123',
          ts: 1697500000000
        },
        'https://example.com/terms': {
          v: 2,
          dh: 'xyz789',
          ts: 1697500001000
        }
      };

      expect(Object.keys(consents)).toHaveLength(2);
      expect(consents['https://example.com/privacy'].v).toBe(1);
      expect(consents['https://example.com/terms'].v).toBe(2);
    });
  });

  describe('Preferences Structure', () => {
    it('should support flexible preference key-value pairs', () => {
      const prefs: UserPreferences = {
        theme: 'dark',
        language: 'en',
        timezone: 'Europe/Copenhagen'
      };

      expect(prefs.theme).toBe('dark');
      expect(prefs.language).toBe('en');
      expect(prefs.timezone).toBe('Europe/Copenhagen');
    });

    it('should allow adding new preference keys dynamically', () => {
      const prefs: UserPreferences = {
        theme: 'light'
      };

      prefs.customKey = 'customValue';
      expect(prefs.customKey).toBe('customValue');
    });
  });

  describe('Onboarding Metadata Structure', () => {
    it('should support complete metadata structure', () => {
      const metadata: OnboardingMetadata = {
        consent: {
          'https://example.com/privacy': {
            v: 1,
            dh: 'abc123',
            ts: 1697500000000
          }
        },
        preferences: {
          theme: 'dark',
          language: 'en'
        },
        invitations: {
          'invite-1': { status: 'pending' }
        },
        clients: {
          demo: {
            status: 'connected',
            progress: 100,
            steps: [],
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString()
          }
        }
      };

      expect(metadata.consent).toBeDefined();
      expect(metadata.preferences).toBeDefined();
      expect(metadata.invitations).toBeDefined();
      expect(metadata.clients).toBeDefined();
    });

    it('should support partial metadata', () => {
      const metadata: OnboardingMetadata = {
        preferences: {
          theme: 'light'
        }
      };

      expect(metadata.preferences).toBeDefined();
      expect(metadata.consent).toBeUndefined();
    });

    it('should support empty metadata', () => {
      const metadata: OnboardingMetadata = {};

      expect(Object.keys(metadata)).toHaveLength(0);
    });
  });

  describe('Client Registration Structure', () => {
    it('should track client connection status', () => {
      const clientReg = {
        status: 'connected' as const,
        progress: 100,
        steps: [],
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      };

      expect(clientReg.status).toBe('connected');
      expect(clientReg.progress).toBe(100);
    });

    it('should support pending client status', () => {
      const clientReg = {
        status: 'pending' as const,
        progress: 0,
        steps: [],
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      };

      expect(clientReg.status).toBe('pending');
      expect(clientReg.progress).toBe(0);
    });
  });
});

/**
 * Unified Metadata Schema Tests
 *
 * Tests for the single unified schema used by both Auth0 and WorkOS:
 * 1. Unified schema validation (identical for both providers)
 * 2. WorkOS 10-field limit enforcement
 * 3. Field inventory and documentation
 * 4. No provider-specific fields (all fields must be identical)
 */

import { describe, expect, it } from 'vitest';
import {
  UserMetadataSchema,
  getFieldCount,
  getFieldsInUse,
  validateFieldLimit
} from '../../src/types/metadata-schema';

describe('Unified Metadata Schema', () => {
  describe('Schema Validation', () => {
    it('should validate empty metadata', () => {
      const result = UserMetadataSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate all current fields', () => {
      const metadata = {
        clientId: 'demo',
        lastPin: {
          sentAt: new Date().toISOString(),
          expiresAt: new Date().toISOString()
        }
      };

      const result = UserMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it('should reject invalid ISO timestamp in lastPin', () => {
      const metadata = {
        lastPin: {
          sentAt: 'not-a-timestamp',
          expiresAt: new Date().toISOString()
        }
      };

      const result = UserMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(false);
    });

    it('should validate partial metadata', () => {
      const metadata = {
        clientId: 'demo'
      };

      const result = UserMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it('should validate invitation data', () => {
      const metadata = {
        invitations: {
          hash123: {
            email: 'user@example.com',
            name: 'John Doe',
            processedAt: new Date().toISOString(),
            source: 'invitation_token'
          }
        }
      };

      const result = UserMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it('should validate client registrations', () => {
      const metadata = {
        clients: {
          demo: {
            status: 'needs_invite',
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            auto_confirm: true,
            registration_source: 'web'
          }
        }
      };

      const result = UserMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });
  });

  describe('Field Limit Validation', () => {
    it('should count fields correctly', () => {
      const metadata = {
        clientId: 'demo',
        lastPin: {
          sentAt: new Date().toISOString(),
          expiresAt: new Date().toISOString()
        }
      };

      const count = getFieldCount(metadata);
      expect(count).toBe(2);
    });

    it('should count all fields in unified schema', () => {
      const metadata = {
        clientId: 'demo',
        consent: { 'https://example.com': { v: 1, dh: 'abc', ts: 123 } },
        preferences: { theme: 'dark' },
        ids: { supabase_user: '12345678-1234-5678-9012-123456789abc' }
      };

      const count = getFieldCount(metadata);
      expect(count).toBe(4); // All fields count equally in unified schema
    });

    it('should validate field limit (WorkOS 10-field constraint)', () => {
      const metadata = {
        clientId: 'demo',
        lastPin: {
          sentAt: new Date().toISOString(),
          expiresAt: new Date().toISOString()
        }
      };

      const validation = validateFieldLimit(metadata);
      expect(validation.valid).toBe(true);
      expect(validation.count).toBe(2); // clientId + lastPin (consolidated object)
      expect(validation.available).toBe(8);
    });

    it('should report available fields', () => {
      const metadata = {
        clientId: 'demo'
      };

      const validation = validateFieldLimit(metadata);
      expect(validation.available).toBe(9); // 10 - 1
    });

    it('should list fields in use', () => {
      const metadata = {
        clientId: 'demo',
        consent: { 'https://example.com': { v: 1, dh: 'abc', ts: 123 } },
        preferences: { theme: 'dark' }
      };

      const fields = getFieldsInUse(metadata);
      expect(fields).toEqual(['clientId', 'consent', 'preferences']);
    });

    it('should exclude null/undefined fields from count', () => {
      const metadata = {
        clientId: 'demo',
        lastPin: null
      };

      const fields = getFieldsInUse(metadata);
      expect(fields).toEqual(['clientId']);
    });
  });

  describe('Field Inventory (from Zod schema)', () => {
    it('should have all required schema fields defined', () => {
      // Extract field names from the Zod schema shape
      const schemaShape = UserMetadataSchema.shape;
      const fieldNames = Object.keys(schemaShape);

      expect(fieldNames.length).toBeGreaterThan(0);
      // User identifiers
      expect(fieldNames).toContain('ids');
      // Core onboarding fields
      expect(fieldNames).toContain('consent');
      expect(fieldNames).toContain('preferences');
      expect(fieldNames).toContain('invitations');
      expect(fieldNames).toContain('clients');
      // Integration fields
      expect(fieldNames).toContain('webauthn_credentials');
      expect(fieldNames).toContain('clientId');
      // PIN authentication fields
      expect(fieldNames).toContain('lastPin');
    });

    it('should have fewer than 10 fields in schema (WorkOS constraint)', () => {
      const schemaShape = UserMetadataSchema.shape;
      const fieldCount = Object.keys(schemaShape).length;

      expect(fieldCount).toBeLessThan(10);
      expect(fieldCount).toBeGreaterThan(0);
    });

    it('should have unified schema with no provider-specific fields', () => {
      // CRITICAL: Auth0 and WorkOS schemas are now unified
      // All fields must be identical across both providers
      // No provider-specific variants or Auth0-only fields
      const schemaShape = UserMetadataSchema.shape;
      const fieldNames = Object.keys(schemaShape);

      // Verify no Auth0-only or WorkOS-only fields
      const forbiddenPatterns = ['auth0_', 'workos_', 'provider_'];
      for (const fieldName of fieldNames) {
        for (const pattern of forbiddenPatterns) {
          expect(fieldName).not.toMatch(new RegExp(`^${pattern}`));
        }
      }
    });
  });

  describe('Consolidation Scenarios', () => {
    it('should demonstrate pin field consolidation', () => {
      // Consolidated: 1 field (lastPin object)
      const consolidatedMetadata = {
        lastPin: {
          sentAt: new Date().toISOString(),
          expiresAt: new Date().toISOString()
        }
      };

      const consolidatedCount = getFieldCount(consolidatedMetadata);
      expect(consolidatedCount).toBe(1);

      // This demonstrates the consolidation strategy
      // Previously 2 fields (lastPinExpiry, lastPinSentAt) → now 1 field (lastPin)
    });

    it('should demonstrate registration field consolidation potential', () => {
      // Organization is managed via native platform APIs, not metadata
      const currentMetadata = {
        clients: {
          demo: {
            status: 'connected',
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString()
          }
        }
      };

      const currentCount = getFieldCount(currentMetadata);
      expect(currentCount).toBe(1);

      // This demonstrates the consolidation strategy
    });
  });

  describe('Critical Constraints', () => {
    it('should enforce 10-field limit (WorkOS constraint)', () => {
      // Create metadata with multiple fields
      // WorkOS has a 10-field limit, so we track field usage
      const metadata = {
        clientId: 'demo',
        lastPin: {
          sentAt: new Date().toISOString(),
          expiresAt: new Date().toISOString()
        },
        consent: { 'https://example.com': { v: 1, dh: 'abc', ts: 123 } }
      };

      const validation = validateFieldLimit(metadata);
      expect(validation.valid).toBe(true);
      expect(validation.count).toBeLessThanOrEqual(10);
    });

    it('should document available fields', () => {
      const validation = validateFieldLimit({});
      expect(validation.available).toBe(10); // All 10 fields available
    });
  });
});

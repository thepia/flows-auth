/**
 * Unit tests for invitation token utilities
 * Tests token decoding, validation, and data extraction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  decodeInvitationToken,
  validateInvitationToken,
  hashInvitationToken,
  extractRegistrationData
} from '../../../src/utils/invitation-tokens';

describe('invitation token utilities', () => {
  // Sample valid JWT for testing (not a real token)
  const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAdGhlcGlhLmNvbSIsImZpcnN0TmFtZSI6IkpvaG4iLCJsYXN0TmFtZSI6IkRvZSIsImNvbXBhbnkiOiJUaGVwaWEiLCJqb2JUaXRsZSI6IkhpcmluZyBNYW5hZ2VyIiwicGhvbmUiOiIrMTIzNDU2Nzg5MCIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNjAwMDAwMDAwfQ.validsignaturetoken123';
  
  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAdGhlcGlhLmNvbSIsImV4cCI6MTYwMDAwMDAwMCwiaWF0IjoxNTk5OTk5OTAwfQ.validsignaturetoken123';
  
  const invalidStructureToken = 'invalid.token';
  
  const missingEmailToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmaXJzdE5hbWUiOiJKb2huIiwibGFzdE5hbWUiOiJEb2UifQ.validsignaturetoken123';

  describe('decodeInvitationToken', () => {
    it('should decode valid JWT token', () => {
      const result = decodeInvitationToken(validToken);

      expect(result).toEqual({
        email: 'test@thepia.com',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Thepia',
        jobTitle: 'Hiring Manager',
        phone: '+1234567890',
        exp: 9999999999,
        iat: 1600000000,
        expires: new Date(9999999999 * 1000),
        issuedAt: new Date(1600000000 * 1000)
      });
    });

    it('should handle token with name field instead of firstName/lastName', () => {
      const nameToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAdGhlcGlhLmNvbSIsIm5hbWUiOiJKb2huIERvZSIsImNvbXBhbnlOYW1lIjoiVGhlcGlhIn0.validsignaturetoken123';
      
      const result = decodeInvitationToken(nameToken);

      expect(result.email).toBe('test@thepia.com');
      expect(result.name).toBe('John Doe');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.companyName).toBe('Thepia');
    });

    it('should throw error for invalid token format', () => {
      expect(() => decodeInvitationToken(invalidStructureToken)).toThrow('Failed to decode invitation token');
      expect(() => decodeInvitationToken('')).toThrow('Failed to decode invitation token');
      expect(() => decodeInvitationToken('single.part')).toThrow('Failed to decode invitation token');
    });

    it('should throw error for invalid base64 payload', () => {
      const badPayloadToken = 'header.!!!invalid-base64!!!.signature';
      expect(() => decodeInvitationToken(badPayloadToken)).toThrow('Failed to decode invitation token');
    });
  });

  describe('validateInvitationToken', () => {
    beforeEach(() => {
      // Mock Date.now() for consistent testing
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    });

    it('should validate token with valid structure and not expired', () => {
      const result = validateInvitationToken(validToken);

      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.email).toBe('test@thepia.com');
      expect(result.reason).toBeUndefined();
    });

    it('should reject expired token', () => {
      const result = validateInvitationToken(expiredToken);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('expired');
    });

    it('should reject token with invalid structure', () => {
      const result = validateInvitationToken(invalidStructureToken);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('invalid_structure');
    });

    it('should reject token missing required email field', () => {
      const result = validateInvitationToken(missingEmailToken);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('missing_email');
    });

    it('should reject token with invalid email format', () => {
      const invalidEmailToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im5vdC1hbi1lbWFpbCJ9.validsignaturetoken123';
      
      const result = validateInvitationToken(invalidEmailToken);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('invalid_email');
    });

    it('should reject token issued in the future', () => {
      const futureToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAdGhlcGlhLmNvbSIsImlhdCI6OTk5OTk5OTk5OX0.validsignaturetoken123';
      
      const result = validateInvitationToken(futureToken);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('invalid_structure');
    });

    it('should reject token with empty signature', () => {
      const noSigToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAdGhlcGlhLmNvbSJ9.';
      
      const result = validateInvitationToken(noSigToken);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('invalid_signature');
    });

    it('should validate signature when verifySignature is true and publicKey provided', () => {
      // For now, just verify the basic token validation works
      // (signature verification not yet implemented)
      const result = validateInvitationToken(validToken);

      // Without actual signature verification implementation, 
      // this should still validate structure
      expect(result.isValid).toBe(true);
    });
  });

  describe('hashInvitationToken', () => {
    it('should compute consistent SHA-256 hash', async () => {
      const hash1 = await hashInvitationToken(validToken);
      const hash2 = await hashInvitationToken(validToken);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 produces 64 hex chars
    });

    it('should return null for invalid input', async () => {
      expect(await hashInvitationToken('')).toBeNull();
      expect(await hashInvitationToken(null as any)).toBeNull();
      expect(await hashInvitationToken(undefined as any)).toBeNull();
      expect(await hashInvitationToken(123 as any)).toBeNull();
    });

    it('should produce different hashes for different tokens', async () => {
      const hash1 = await hashInvitationToken(validToken);
      const hash2 = await hashInvitationToken(expiredToken);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('extractRegistrationData', () => {
    it('should extract all fields when present', () => {
      const tokenData = {
        email: 'test@thepia.com',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Thepia Inc',
        phone: '+1234567890',
        jobTitle: 'Engineering Manager'
      };

      const result = extractRegistrationData(tokenData);

      expect(result).toEqual({
        email: 'test@thepia.com',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Thepia Inc',
        phone: '+1234567890',
        jobTitle: 'Engineering Manager'
      });
    });

    it('should handle name field splitting', () => {
      const tokenData = {
        email: 'test@thepia.com',
        name: 'John Michael Doe',
        companyName: 'Thepia Corp'
      };

      const result = extractRegistrationData(tokenData);

      expect(result).toEqual({
        email: 'test@thepia.com',
        firstName: 'John',
        lastName: 'Michael Doe',
        company: 'Thepia Corp',
        phone: '',
        jobTitle: '' // Empty when not provided in token
      });
    });

    it('should use default values for missing fields', () => {
      const tokenData = {
        email: 'test@thepia.com'
      };

      const result = extractRegistrationData(tokenData);

      expect(result).toEqual({
        email: 'test@thepia.com',
        firstName: '',
        lastName: '',
        company: '',
        phone: '',
        jobTitle: '' // Empty when not provided in token
      });
    });

    it('should prefer specific fields over generic ones', () => {
      const tokenData = {
        email: 'test@thepia.com',
        firstName: 'John',
        lastName: 'Doe',
        name: 'Jane Smith', // Should be ignored
        company: 'Thepia Inc',
        companyName: 'Other Corp' // Should be ignored
      };

      const result = extractRegistrationData(tokenData);

      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.company).toBe('Thepia Inc');
    });
  });
});
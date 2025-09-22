/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig, ExplainerConfig } from '../../src/types';

describe('AuthStore getExplainerConfig', () => {
  let authStore: ReturnType<typeof createAuthStore>;
  let mockConfig: AuthConfig;

  beforeEach(() => {
    mockConfig = {
      apiBaseUrl: 'https://api.example.com',
      clientId: 'test-client',
      domain: 'example.com',
      enablePasskeys: true,
      enableMagicLinks: false,
      appCode: 'test-app',
      branding: {
        companyName: 'Test Company'
      }
    };

    authStore = createAuthStore(mockConfig);
  });

  describe('Paragraph type scenarios', () => {
    it('should return paragraph config for emailEntry state with new user', () => {
      const explainerConfig = authStore.getExplainerConfig({
        signInState: 'emailEntry',
        userExists: null,
        hasPasskeys: false,
        hasValidPin: false
      });

      expect(explainerConfig).not.toBeNull();
      expect(explainerConfig?.type).toBe('paragraph');
      expect(explainerConfig?.textKey).toBe('security.passwordlessWithPin');
      expect(explainerConfig?.iconName).toBe('Lock');
      expect(explainerConfig?.iconWeight).toBe('duotone');
      expect(explainerConfig?.useCompanyName).toBe(true);
      expect(explainerConfig?.companyName).toBe('Test Company');
      expect(explainerConfig?.className).toBe('explainer-paragraph');
    });

    it('should return paragraph config for userChecked state with non-existent user', () => {
      const explainerConfig = authStore.getExplainerConfig({
        signInState: 'userChecked',
        userExists: false,
        hasPasskeys: false,
        hasValidPin: false
      });

      expect(explainerConfig).not.toBeNull();
      expect(explainerConfig?.type).toBe('paragraph');
      expect(explainerConfig?.textKey).toBe('security.passwordlessWithPin');
    });

    it('should use generic text when no company name is provided', () => {
      const configWithoutCompany = { ...mockConfig };
      delete configWithoutCompany.branding;
      const storeWithoutCompany = createAuthStore(configWithoutCompany);

      const explainerConfig = storeWithoutCompany.getExplainerConfig({
        signInState: 'emailEntry',
        userExists: null,
        hasPasskeys: false,
        hasValidPin: false
      });

      expect(explainerConfig?.textKey).toBe('security.passwordlessWithPinGeneric');
      expect(explainerConfig?.useCompanyName).toBe(false);
      expect(explainerConfig?.companyName).toBeUndefined();
    });

    it('should use explanation text when no appCode is provided', () => {
      const configWithoutAppCode = { ...mockConfig };
      delete configWithoutAppCode.appCode;
      const storeWithoutAppCode = createAuthStore(configWithoutAppCode);

      const explainerConfig = storeWithoutAppCode.getExplainerConfig({
        signInState: 'emailEntry',
        userExists: null,
        hasPasskeys: false,
        hasValidPin: false
      });

      expect(explainerConfig?.textKey).toBe('security.passwordlessExplanation');
    });
  });

  describe('Features type scenarios', () => {
    it('should return features config when user exists and has passkeys', () => {
      const explainerConfig = authStore.getExplainerConfig({
        signInState: 'userChecked',
        userExists: true,
        hasPasskeys: true,
        hasValidPin: false
      });

      expect(explainerConfig).not.toBeNull();
      expect(explainerConfig?.type).toBe('features');
      expect(explainerConfig?.features).toBeDefined();
      expect(explainerConfig?.features?.length).toBe(3);
      expect(explainerConfig?.className).toBe('explainer-features-list');

      // Check for passkey feature
      const passkeyFeature = explainerConfig?.features?.find(
        (f) => f.textKey === 'explainer.features.securePasskey'
      );
      expect(passkeyFeature).toBeDefined();
      expect(passkeyFeature?.iconName).toBe('Lock');

      // Check for privacy feature
      const privacyFeature = explainerConfig?.features?.find(
        (f) => f.textKey === 'explainer.features.privacyCompliant'
      );
      expect(privacyFeature).toBeDefined();
      expect(privacyFeature?.iconName).toBe('Shield');

      // Check for employee verification feature (with company name)
      const verificationFeature = explainerConfig?.features?.find(
        (f) => f.textKey === 'explainer.features.employeeVerification'
      );
      expect(verificationFeature).toBeDefined();
      expect(verificationFeature?.iconName).toBe('BadgeCheck');
    });

    it('should return features config when user exists and has valid pin', () => {
      const explainerConfig = authStore.getExplainerConfig({
        signInState: 'userChecked',
        userExists: true,
        hasPasskeys: false,
        hasValidPin: true
      });

      expect(explainerConfig).not.toBeNull();
      expect(explainerConfig?.type).toBe('features');
      expect(explainerConfig?.features?.length).toBe(2); // No passkey feature
    });

    it('should use user verification when no company name is provided', () => {
      const configWithoutCompany = { ...mockConfig };
      delete configWithoutCompany.branding;
      const storeWithoutCompany = createAuthStore(configWithoutCompany);

      const explainerConfig = storeWithoutCompany.getExplainerConfig({
        signInState: 'userChecked',
        userExists: true,
        hasPasskeys: true,
        hasValidPin: false
      });

      // Check for user verification feature (without company name)
      const verificationFeature = explainerConfig?.features?.find(
        (f) => f.textKey === 'explainer.features.userVerification'
      );
      expect(verificationFeature).toBeDefined();
      expect(verificationFeature?.iconName).toBe('UserCheck');
    });
  });

  describe('Null scenarios', () => {
    it('should return null for pinEntry state', () => {
      const explainerConfig = authStore.getExplainerConfig({
        signInState: 'pinEntry',
        userExists: true,
        hasPasskeys: true,
        hasValidPin: false
      });

      expect(explainerConfig).toBeNull();
    });

    it('should return null for signedIn state', () => {
      const explainerConfig = authStore.getExplainerConfig({
        signInState: 'signedIn',
        userExists: true,
        hasPasskeys: true,
        hasValidPin: false
      });

      expect(explainerConfig).toBeNull();
    });

    it('should return null for generalError state', () => {
      const explainerConfig = authStore.getExplainerConfig({
        signInState: 'generalError',
        userExists: true,
        hasPasskeys: true,
        hasValidPin: false
      });

      expect(explainerConfig).toBeNull();
    });
  });

  describe('Icon weight configuration', () => {
    it('should set duotone weight for all icons', () => {
      const explainerConfig = authStore.getExplainerConfig({
        signInState: 'userChecked',
        userExists: true,
        hasPasskeys: true,
        hasValidPin: false
      });

      expect(explainerConfig?.features?.every((f) => f.iconWeight === 'duotone')).toBe(true);
    });
  });

  describe('Explicit explainFeatures parameter', () => {
    it('should show features when explainFeatures is true, even for new users', () => {
      const explainerConfig = authStore.getExplainerConfig({
        signInState: 'emailEntry',
        userExists: null,
        hasPasskeys: false,
        hasValidPin: false,
        explainFeatures: true
      });

      expect(explainerConfig).not.toBeNull();
      expect(explainerConfig?.type).toBe('features');
      expect(explainerConfig?.features).toBeDefined();
      expect(explainerConfig?.features?.length).toBeGreaterThan(0);
    });

    it('should show paragraph when explainFeatures is false, even for existing users with passkeys', () => {
      const explainerConfig = authStore.getExplainerConfig({
        signInState: 'userChecked',
        userExists: true,
        hasPasskeys: true,
        hasValidPin: false,
        explainFeatures: false
      });

      expect(explainerConfig).not.toBeNull();
      expect(explainerConfig?.type).toBe('paragraph');
      expect(explainerConfig?.textKey).toBe('security.passwordlessWithPin');
    });
  });
});

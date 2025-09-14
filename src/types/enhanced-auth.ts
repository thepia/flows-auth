/**
 * Enhanced authentication types for invitation flows and common utilities
 */

import type { InvitationTokenData } from '../utils/invitation-tokens';

export interface EnhancedUserCheck {
  exists: boolean;
  hasPasskey: boolean;
  hasWebAuthn: boolean; // Alias for hasPasskey
  invitationTokenHash?: string;
  userId?: string;
  requiresPasskeySetup?: boolean;
  registrationMode?: 'new_user' | 'complete_passkey' | 'sign_in';
}

export interface InvitationAuthOptions {
  token: string;
  tokenData?: InvitationTokenData;
  skipTokenValidation?: boolean;
}

export interface AuthFlowResult {
  mode: 'register' | 'complete_passkey' | 'sign_in';
  prefillData?: {
    email: string;
    firstName: string;
    lastName: string;
    company: string;
    phone: string;
    jobTitle: string;
  };
  message?: string;
}

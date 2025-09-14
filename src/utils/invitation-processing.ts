/**
 * Invitation Token Processing Utilities
 * Handles invitation token validation and user status checking
 */

import type { InvitationTokenData, TokenValidationResult } from './invitation-tokens';
import {
  decodeInvitationToken,
  hashInvitationToken,
  validateInvitationToken
} from './invitation-tokens';

/**
 * Result of invitation token processing
 */
export interface InvitationProcessingResult {
  success: boolean;
  action: 'signin' | 'register' | 'complete_registration' | 'error';
  error?: string;
  userExists: boolean;
  hasPasskey: boolean;
  tokenData?: InvitationTokenData;
  tokenValid: boolean;
  tokenHashMatches?: boolean;
  registrationData?: {
    email: string;
    firstName: string;
    lastName: string;
    company: string;
    phone: string;
    jobTitle: string;
  };
  debugInfo?: {
    userCheck: any;
    tokenValidation: TokenValidationResult;
    expectedProperties: string[];
    actualProperties: string[];
  };
}

/**
 * Process invitation token and determine next action
 */
export async function processInvitationToken(
  invitationToken: string,
  authStore: any,
  options: {
    errorReporter?: (type: string, data: any) => void;
    enableDebugLogging?: boolean;
  } = {}
): Promise<InvitationProcessingResult> {
  const { errorReporter, enableDebugLogging = false } = options;

  try {
    // Step 1: Decode the invitation token
    const tokenData = decodeInvitationToken(invitationToken);
    if (enableDebugLogging) {
      console.log('Invitation token decoded:', tokenData);
    }

    // Step 2: Validate the token
    const tokenValidationResult = validateInvitationToken(invitationToken, tokenData);
    const tokenValid = tokenValidationResult.isValid;

    if (enableDebugLogging) {
      console.log('Token validation result:', tokenValidationResult);
    }

    if (!tokenValid) {
      return {
        success: false,
        action: 'error',
        error:
          tokenValidationResult.reason ||
          'Invalid or expired invitation token. Please contact support for a new invitation.',
        userExists: false,
        hasPasskey: false,
        tokenData,
        tokenValid: false,
        debugInfo: {
          userCheck: null,
          tokenValidation: tokenValidationResult,
          expectedProperties: [],
          actualProperties: []
        }
      };
    }

    // Step 3: Check if user exists
    const userCheck = await authStore.checkUser(tokenData.email);

    if (enableDebugLogging) {
      console.log('User exists, checking passkey status:', userCheck);
      console.log('🔍 DEBUG: userCheck properties:', {
        keys: Object.keys(userCheck),
        hasPasskey: userCheck.hasPasskey,
        hasWebAuthn: userCheck.hasWebAuthn,
        invitationTokenHash: userCheck.invitationTokenHash,
        invitationTokenHashExists: !!userCheck.invitationTokenHash
      });
    }

    // Send debug info to error reporter
    if (errorReporter) {
      errorReporter('User check result', {
        email: tokenData.email,
        userCheck: userCheck,
        expectedProperties: ['exists', 'hasPasskey', 'hasWebAuthn', 'invitationTokenHash'],
        actualProperties: Object.keys(userCheck)
      });
    }

    // Check for passkey using both possible property names (API inconsistency)
    const hasPasskey = userCheck.hasPasskey || userCheck.hasWebAuthn;

    if (userCheck.exists) {
      // User exists - determine next action
      if (!hasPasskey && tokenValid) {
        // User exists but no passkey + valid token = resume passkey registration
        if (enableDebugLogging) {
          console.log('User exists but no passkey, resuming passkey registration with token');
        }

        // Verify token hash for security (if available)
        let tokenHashMatches = true;
        if (userCheck.invitationTokenHash) {
          const currentTokenHash = await hashInvitationToken(invitationToken);
          tokenHashMatches = currentTokenHash === userCheck.invitationTokenHash;

          if (enableDebugLogging) {
            console.log('Token hash verification:', {
              stored: userCheck.invitationTokenHash?.substring(0, 8) + '...',
              current: currentTokenHash?.substring(0, 8) + '...',
              matches: tokenHashMatches
            });
          }

          // Send hash comparison data to error reporter
          if (errorReporter) {
            errorReporter('Token hash verification', {
              email: tokenData.email,
              hasStoredHash: !!userCheck.invitationTokenHash,
              storedHashPreview: `${userCheck.invitationTokenHash?.substring(0, 8)}...`,
              currentHashPreview: `${currentTokenHash?.substring(0, 8)}...`,
              hashesMatch: tokenHashMatches
            });
          }

          if (!tokenHashMatches) {
            if (enableDebugLogging) {
              console.warn('🔒 Token hash mismatch - token may not be valid for this user');
            }
            return {
              success: false,
              action: 'error',
              error:
                'Invalid invitation token for this user. Please use the original invitation link.',
              userExists: true,
              hasPasskey: false,
              tokenData,
              tokenValid: true,
              tokenHashMatches: false,
              debugInfo: {
                userCheck,
                tokenValidation: tokenValidationResult,
                expectedProperties: ['exists', 'hasPasskey', 'hasWebAuthn', 'invitationTokenHash'],
                actualProperties: Object.keys(userCheck)
              }
            };
          }

          if (enableDebugLogging) {
            console.log('✅ Token hash verified - resuming passkey registration');
          }
        } else {
          if (enableDebugLogging) {
            console.warn(
              '⚠️ No stored token hash found - allowing registration without token verification'
            );
          }

          // Send missing hash data to error reporter
          if (errorReporter) {
            errorReporter('Missing invitation token hash', {
              email: tokenData.email,
              userCheckKeys: Object.keys(userCheck),
              hasInvitationTokenHash: 'invitationTokenHash' in userCheck,
              invitationTokenHashValue: userCheck.invitationTokenHash
            });
          }
        }

        // Return complete registration action with pre-filled data
        return {
          success: true,
          action: 'complete_registration',
          userExists: true,
          hasPasskey: false,
          tokenData,
          tokenValid: true,
          tokenHashMatches,
          registrationData: {
            email: tokenData.email || '',
            firstName: tokenData.firstName || tokenData.name?.split(' ')[0] || '',
            lastName: tokenData.lastName || tokenData.name?.split(' ').slice(1).join(' ') || '',
            company: tokenData.company || tokenData.companyName || '',
            phone: tokenData.phone || '',
            jobTitle: tokenData.jobTitle || 'Hiring Manager'
          },
          debugInfo: {
            userCheck,
            tokenValidation: tokenValidationResult,
            expectedProperties: ['exists', 'hasPasskey', 'hasWebAuthn', 'invitationTokenHash'],
            actualProperties: Object.keys(userCheck)
          }
        };
      }

      // User exists and has passkey - show sign-in form
      if (hasPasskey) {
        if (enableDebugLogging) {
          console.log('User exists with passkey, showing sign-in form');
        }
        return {
          success: true,
          action: 'signin',
          userExists: true,
          hasPasskey: true,
          tokenData,
          tokenValid: true,
          debugInfo: {
            userCheck,
            tokenValidation: tokenValidationResult,
            expectedProperties: ['exists', 'hasPasskey', 'hasWebAuthn', 'invitationTokenHash'],
            actualProperties: Object.keys(userCheck)
          }
        };
      }

      // User exists but no passkey and no valid token - show error
      if (enableDebugLogging) {
        console.log('User exists but no passkey and no valid token');
      }
      return {
        success: false,
        action: 'error',
        error: 'Account exists but requires setup completion. Please contact support.',
        userExists: true,
        hasPasskey: false,
        tokenData,
        tokenValid: false,
        debugInfo: {
          userCheck,
          tokenValidation: tokenValidationResult,
          expectedProperties: ['exists', 'hasPasskey', 'hasWebAuthn', 'invitationTokenHash'],
          actualProperties: Object.keys(userCheck)
        }
      };
    }

    // User doesn't exist and token is valid - show registration form
    if (enableDebugLogging) {
      console.log('Valid token for new user, showing registration form');
    }

    return {
      success: true,
      action: 'register',
      userExists: false,
      hasPasskey: false,
      tokenData,
      tokenValid: true,
      registrationData: {
        email: tokenData.email || '',
        firstName: tokenData.firstName || tokenData.name?.split(' ')[0] || '',
        lastName: tokenData.lastName || tokenData.name?.split(' ').slice(1).join(' ') || '',
        company: tokenData.company || tokenData.companyName || '',
        phone: tokenData.phone || '',
        jobTitle: tokenData.jobTitle || ''
      },
      debugInfo: {
        userCheck,
        tokenValidation: tokenValidationResult,
        expectedProperties: ['exists', 'hasPasskey', 'hasWebAuthn', 'invitationTokenHash'],
        actualProperties: Object.keys(userCheck)
      }
    };
  } catch (error) {
    if (enableDebugLogging) {
      console.error('Failed to process invitation token:', error);
    }

    return {
      success: false,
      action: 'error',
      error: 'Unable to verify invitation. Please try again or contact support.',
      userExists: false,
      hasPasskey: false,
      tokenValid: false,
      debugInfo: {
        userCheck: null,
        tokenValidation: { isValid: false, reason: (error as Error).message },
        expectedProperties: [],
        actualProperties: []
      }
    };
  }
}

/**
 * Extract registration data from invitation token
 */
export function extractRegistrationDataFromToken(tokenData: InvitationTokenData): {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  jobTitle: string;
} {
  return {
    email: tokenData.email || '',
    firstName: tokenData.firstName || tokenData.name?.split(' ')[0] || '',
    lastName: tokenData.lastName || tokenData.name?.split(' ').slice(1).join(' ') || '',
    company: tokenData.company || tokenData.companyName || '',
    phone: tokenData.phone || '',
    jobTitle: tokenData.jobTitle || 'Hiring Manager'
  };
}

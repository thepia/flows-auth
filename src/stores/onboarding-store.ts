/**
 * Onboarding Store
 *
 * Zustand store for managing user onboarding, consent, preferences, and invitations.
 * Handles all user metadata that doesn't fit into core auth state.
 */

import { devtools } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';
import type { AuthApiClient } from '../api/auth-api';
import {
  addConsentToMetadata,
  confirmConsentInMetadata,
  extractOnboardingMetadata,
  getAllConsents,
  getConsentForUrl,
  removeConsentForUrl
} from '../api/utils/consent-metadata';
import type {
  ClientRegistration,
  CompactConsentRecord,
  ConfirmConsentRequest,
  GetOnboardingMetadataResponse,
  Invitations,
  OnboardingMetadata,
  UpdateOnboardingMetadataRequest,
  UserPreferences
} from '../types/onboarding';
import {
  OnboardingMetadataSchema,
  getClientStatus,
  getConsentedUrls,
  hasConsentForUrl,
  parseOnboardingMetadata
} from '../types/onboarding';

export interface OnboardingState {
  // Metadata
  metadata: OnboardingMetadata;
  loading: boolean;
  error: string | null;

  // Actions
  loadMetadata: () => Promise<void>;
  updateMetadata: (updates: UpdateOnboardingMetadataRequest) => Promise<void>;

  // Consent actions
  addConsent: (url: string, record: CompactConsentRecord) => Promise<void>;
  confirmConsent: (request: ConfirmConsentRequest) => Promise<void>;
  removeConsent: (url: string) => Promise<void>;
  hasConsent: (url: string) => boolean;
  getConsent: (url: string) => CompactConsentRecord | undefined;
  getAllConsents: () => Record<string, CompactConsentRecord>;
  getConsentedUrls: () => string[];

  // Preference actions
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  getPreference: (key: string) => any;

  // Client registration actions
  updateClientStatus: (clientId: string, status: Partial<ClientRegistration>) => Promise<void>;
  getClientStatus: (clientId: string) => ClientRegistration | undefined;

  // Invitations actions
  updateInvitations: (invitations: Partial<Invitations>) => Promise<void>;

  // State management
  clearError: () => void;
  reset: () => void;
}

interface StoreOptions {
  api: AuthApiClient;
  config: any;
  name?: string;
}

export function createOnboardingStore(options: StoreOptions) {
  const { api, config } = options;

  const store = createStore<OnboardingState>()(
    devtools(
      (set, get) => ({
        metadata: {},
        loading: false,
        error: null,

        loadMetadata: async () => {
          set({ loading: true, error: null });
          try {
            const response = await api.getOnboardingMetadata();
            const validated = OnboardingMetadataSchema.parse(response.metadata);
            set({ metadata: validated, loading: false });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load metadata';
            set({ error: message, loading: false });
          }
        },

        updateMetadata: async (updates: UpdateOnboardingMetadataRequest) => {
          set({ loading: true, error: null });
          try {
            const response = await api.updateOnboardingMetadata(updates);
            const validated = OnboardingMetadataSchema.parse(response.metadata);
            set({ metadata: validated, loading: false });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update metadata';
            set({ error: message, loading: false });
            throw error;
          }
        },

        addConsent: async (url: string, record: CompactConsentRecord) => {
          const current = get().metadata;
          const updated = addConsentToMetadata(current, url, record);
          await get().updateMetadata(updated);
        },

        confirmConsent: async (request: ConfirmConsentRequest) => {
          const current = get().metadata;
          const updated = confirmConsentInMetadata(current, request);
          await get().updateMetadata(updated);
        },

        removeConsent: async (url: string) => {
          const current = get().metadata;
          const updated = removeConsentForUrl(current, url);
          await get().updateMetadata(updated);
        },

        hasConsent: (url: string) => {
          return hasConsentForUrl(get().metadata, url);
        },

        getConsent: (url: string) => {
          return getConsentForUrl(get().metadata, url);
        },

        getAllConsents: () => {
          return getAllConsents(get().metadata);
        },

        getConsentedUrls: () => {
          return getConsentedUrls(get().metadata);
        },

        updatePreferences: async (prefs: Partial<UserPreferences>) => {
          const current = get().metadata;
          const updated = {
            preferences: {
              ...(current.preferences || {}),
              ...prefs
            }
          };
          await get().updateMetadata(updated);
        },

        getPreference: (key: string) => {
          return get().metadata.preferences?.[key];
        },

        updateClientStatus: async (clientId: string, status: Partial<ClientRegistration>) => {
          const current = get().metadata;
          const existing = current.clients?.[clientId];
          const updated = {
            clients: {
              ...(current.clients || {}),
              [clientId]: {
                ...existing,
                ...status
              }
            }
          };
          await get().updateMetadata(updated);
        },

        getClientStatus: (clientId: string) => {
          return getClientStatus(get().metadata, clientId);
        },

        updateInvitations: async (invitations: Partial<Invitations>) => {
          const current = get().metadata;
          const updated = {
            invitations: {
              ...(current.invitations || {}),
              ...invitations
            }
          };
          await get().updateMetadata(updated);
        },

        clearError: () => {
          set({ error: null });
        },

        reset: () => {
          set({
            metadata: {},
            loading: false,
            error: null
          });
        }
      }),
      { name: options.name || 'onboarding-store' }
    )
  );

  return store;
}

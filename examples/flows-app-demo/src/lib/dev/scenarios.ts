/**
 * Development Scenarios for Flows App Demo
 * Based on nets-offboarding-flows dev scenarios
 */

export type DevBranding = {
  name: string;
  className: string;
  colors: {
    primary: string;
    accent: string;
    logo?: string;
  };
  companyName: string;
  description: string;
};

export type DevScenario = {
  id: string;
  name: string;
  description: string;
  branding: DevBranding;
  config: {
    enablePasskeys: boolean;
    enableMagicLinks: boolean;
    enablePasswordLogin: boolean;
    apiBaseUrl: string;
    clientId: string;
    errorReporting?: {
      enabled: boolean;
      endpoint?: string;
      debug?: boolean;
    };
  };
};

export const DEV_BRANDINGS: DevBranding[] = [
  {
    name: 'Thepia Default',
    className: 'brand-thepia',
    colors: { primary: '#0066cc', accent: '#ed8b00' },
    companyName: 'Thepia',
    description: 'Official Thepia branding',
  },
  {
    name: 'Emerald Corp',
    className: 'brand-emerald',
    colors: { primary: '#059669', accent: '#f59e0b' },
    companyName: 'Emerald Corporation',
    description: 'Green primary with amber accent',
  },
  {
    name: 'Purple Tech',
    className: 'brand-purple',
    colors: { primary: '#7c3aed', accent: '#f59e0b' },
    companyName: 'Purple Tech Solutions',
    description: 'Purple primary for tech companies',
  },
  {
    name: 'Rose Financial',
    className: 'brand-rose',
    colors: { primary: '#e11d48', accent: '#f59e0b' },
    companyName: 'Rose Financial Group',
    description: 'Professional red for financial services',
  },
];

/**
 * Auto-detect API server with fallback to production
 * Implements the same pattern as thepia.com
 */
async function detectApiServer(): Promise<string> {
  // 1. Check for explicit environment variable (highest priority)
  if (typeof window !== 'undefined' && window.location.search.includes('api=local')) {
    return 'https://dev.thepia.com:8443';
  }

  if (typeof window !== 'undefined' && window.location.search.includes('api=production')) {
    return 'https://api.thepia.com';
  }

  // 2. Auto-detection: Check if local API server is available
  try {
    const response = await fetch('https://dev.thepia.com:8443/health', {
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });

    if (response.ok) {
      console.log('✅ Local API server detected and responding');
      return 'https://dev.thepia.com:8443';
    }
  } catch (_error) {
    console.log('⚠️ Local API server not detected, falling back to production');
  }

  // 3. Production fallback (default)
  console.log('🌐 Using production API server');
  return 'https://api.thepia.com';
}

export const DEV_SCENARIOS: DevScenario[] = [
  {
    id: 'default-full',
    name: 'Auto-Detect API - Passwordless Auth',
    description: 'Auto-detects local API server, falls back to production',
    branding: DEV_BRANDINGS[0],
    config: {
      enablePasskeys: true,
      enableMagicLinks: true,
      enablePasswordLogin: false,
      apiBaseUrl: 'auto-detect', // Will be replaced by detectApiServer()
      clientId: 'flows-app-demo',
      errorReporting: {
        enabled: true,
        endpoint: 'auto-detect', // Will be replaced by detectApiServer()
        debug: true,
      },
    },
  },
  {
    id: 'passkey-only',
    name: 'Auto-Detect API - Passkey Only',
    description: 'WebAuthn/passkey authentication only with auto-detected API',
    branding: DEV_BRANDINGS[1],
    config: {
      enablePasskeys: true,
      enableMagicLinks: false,
      enablePasswordLogin: false,
      apiBaseUrl: 'auto-detect',
      clientId: 'flows-app-demo',
      errorReporting: {
        enabled: true,
        endpoint: 'auto-detect',
        debug: true,
      },
    },
  },
  {
    id: 'magic-only',
    name: 'Auto-Detect API - Magic Link Only',
    description: 'Email-based passwordless authentication with auto-detected API',
    branding: DEV_BRANDINGS[2],
    config: {
      enablePasskeys: false,
      enableMagicLinks: true,
      enablePasswordLogin: false,
      apiBaseUrl: 'auto-detect',
      clientId: 'flows-app-demo',
      errorReporting: {
        enabled: true,
        endpoint: 'auto-detect',
        debug: true,
      },
    },
  },
  {
    id: 'enterprise',
    name: 'Auto-Detect API - Enterprise Setup',
    description: 'Professional passwordless authentication with auto-detected API',
    branding: DEV_BRANDINGS[3],
    config: {
      enablePasskeys: true,
      enableMagicLinks: true,
      enablePasswordLogin: false,
      apiBaseUrl: 'auto-detect',
      clientId: 'flows-app-demo-enterprise',
      errorReporting: {
        enabled: true,
        endpoint: 'auto-detect',
        debug: true,
      },
    },
  },
];

class DevScenarioManager {
  private currentScenario: DevScenario = DEV_SCENARIOS[0]; // Default to first scenario (auto-detect)
  private listeners: Array<(scenario: DevScenario) => void> = [];
  private resolvedApiUrl: string | null = null;

  async getCurrentScenario(): Promise<DevScenario> {
    // If scenario uses auto-detect, resolve the API URL
    if (this.currentScenario.config.apiBaseUrl === 'auto-detect') {
      if (!this.resolvedApiUrl) {
        this.resolvedApiUrl = await detectApiServer();
      }

      // Return scenario with resolved API URLs
      return {
        ...this.currentScenario,
        config: {
          ...this.currentScenario.config,
          apiBaseUrl: this.resolvedApiUrl,
          errorReporting: {
            ...this.currentScenario.config.errorReporting,
            endpoint:
              this.currentScenario.config.errorReporting?.endpoint === 'auto-detect'
                ? `${this.resolvedApiUrl}/api/error-reports`
                : this.currentScenario.config.errorReporting?.endpoint,
          },
        },
      };
    }

    return this.currentScenario;
  }

  // Synchronous version for compatibility
  getCurrentScenarioSync(): DevScenario {
    return this.currentScenario;
  }

  setScenario(scenarioId: string): void {
    const scenario = DEV_SCENARIOS.find((s) => s.id === scenarioId);
    if (scenario) {
      this.currentScenario = scenario;
      this.resolvedApiUrl = null; // Clear cached API URL when switching scenarios
      this.applyBranding(scenario.branding);
      this.notifyListeners();
    }
  }

  private applyBranding(branding: DevBranding): void {
    // Apply branding class to document
    document.body.className = `${document.body.className.replace(/brand-\w+/g, '')} ${branding.className}`;

    // Update CSS custom properties
    document.documentElement.style.setProperty('--brand-primary-override', branding.colors.primary);
    document.documentElement.style.setProperty('--brand-accent-override', branding.colors.accent);
  }

  subscribe(callback: (scenario: DevScenario) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback(this.currentScenario));
  }

  // Simulate different authentication states
  triggerScenario(type: 'new-user' | 'existing-user' | 'error' | 'network-error'): void {
    console.log(`🎭 Dev Scenario: ${type}`);

    switch (type) {
      case 'new-user':
        localStorage.removeItem('auth_access_token');
        localStorage.removeItem('auth_user');
        console.log('👤 Simulating new user (cleared auth)');
        break;

      case 'existing-user':
        localStorage.setItem('auth_access_token', 'demo-token');
        localStorage.setItem(
          'auth_user',
          JSON.stringify({
            id: 'demo-user',
            email: 'demo@example.com',
            name: 'Demo User',
            emailVerified: true,
            createdAt: new Date().toISOString(),
          })
        );
        console.log('👤 Simulating existing user (set auth)');
        break;

      case 'error':
        console.log('❌ Simulating auth error (check network tab)');
        break;

      case 'network-error':
        console.log('📶 Simulating network error');
        break;
    }

    // Trigger page reload to apply changes
    window.location.reload();
  }
}

export const devScenarioManager = new DevScenarioManager();

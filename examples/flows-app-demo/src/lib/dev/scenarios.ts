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
    description: 'Official Thepia branding'
  },
  {
    name: 'Emerald Corp',
    className: 'brand-emerald', 
    colors: { primary: '#059669', accent: '#f59e0b' },
    companyName: 'Emerald Corporation',
    description: 'Green primary with amber accent'
  },
  {
    name: 'Purple Tech',
    className: 'brand-purple',
    colors: { primary: '#7c3aed', accent: '#f59e0b' },
    companyName: 'Purple Tech Solutions',
    description: 'Purple primary for tech companies'
  },
  {
    name: 'Rose Financial',
    className: 'brand-rose',
    colors: { primary: '#e11d48', accent: '#f59e0b' },
    companyName: 'Rose Financial Group',
    description: 'Professional red for financial services'
  }
];

export const DEV_SCENARIOS: DevScenario[] = [
  {
    id: 'default-full',
    name: 'Default - Passwordless Auth',
    description: 'Passwordless authentication with passkeys and magic links',
    branding: DEV_BRANDINGS[0],
    config: {
      enablePasskeys: true,
      enableMagicLinks: true, 
      enablePasswordLogin: false,
      apiBaseUrl: 'https://dev.thepia.com:8443',
      clientId: 'flows-app-demo',
      errorReporting: {
        enabled: true,
        endpoint: 'https://dev.thepia.com:8443/api/error-reports',
        debug: true
      }
    }
  },
  {
    id: 'passkey-only',
    name: 'Passkey Only',
    description: 'WebAuthn/passkey authentication only',
    branding: DEV_BRANDINGS[1],
    config: {
      enablePasskeys: true,
      enableMagicLinks: false,
      enablePasswordLogin: false,
      apiBaseUrl: 'https://dev.thepia.com:8443',
      clientId: 'flows-app-demo',
      errorReporting: {
        enabled: true,
        endpoint: 'https://dev.thepia.com:8443/api/error-reports',
        debug: true
      }
    }
  },
  {
    id: 'magic-only',
    name: 'Magic Link Only',
    description: 'Email-based passwordless authentication',
    branding: DEV_BRANDINGS[2],
    config: {
      enablePasskeys: false,
      enableMagicLinks: true,
      enablePasswordLogin: false,
      apiBaseUrl: 'https://dev.thepia.com:8443',
      clientId: 'flows-app-demo',
      errorReporting: {
        enabled: true,
        endpoint: 'https://dev.thepia.com:8443/api/error-reports',
        debug: true
      }
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise Setup',
    description: 'Professional passwordless authentication',
    branding: DEV_BRANDINGS[3],
    config: {
      enablePasskeys: true,
      enableMagicLinks: true,
      enablePasswordLogin: false,
      apiBaseUrl: 'https://dev.thepia.com:8443',
      clientId: 'flows-app-demo-enterprise',
      errorReporting: {
        enabled: true,
        endpoint: 'https://dev.thepia.com:8443/api/error-reports',
        debug: true
      }
    }
  }
];

class DevScenarioManager {
  private currentScenario: DevScenario = DEV_SCENARIOS[0];
  private listeners: Array<(scenario: DevScenario) => void> = [];

  getCurrentScenario(): DevScenario {
    return this.currentScenario;
  }

  setScenario(scenarioId: string): void {
    const scenario = DEV_SCENARIOS.find(s => s.id === scenarioId);
    if (scenario) {
      this.currentScenario = scenario;
      this.applyBranding(scenario.branding);
      this.notifyListeners();
    }
  }

  private applyBranding(branding: DevBranding): void {
    // Apply branding class to document
    document.body.className = document.body.className
      .replace(/brand-\w+/g, '') + ` ${branding.className}`;
    
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
    this.listeners.forEach(callback => callback(this.currentScenario));
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
        localStorage.setItem('auth_user', JSON.stringify({
          id: 'demo-user',
          email: 'demo@example.com',
          name: 'Demo User',
          emailVerified: true,
          createdAt: new Date().toISOString()
        }));
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
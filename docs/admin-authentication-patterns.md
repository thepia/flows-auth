# Admin Authentication Patterns

## Overview

This document describes how to use flows-auth for administrative applications that require corporate authentication with different security and access patterns than employee self-service applications.

## Authentication Patterns Comparison

### Employee Pattern (app.thepia.net)
- **Users**: Individual employees accessing their own data
- **Auth Method**: WebAuthn/Passkeys on personal devices
- **Session**: Long-lived with device-bound credentials
- **Access**: Self-service, limited to own records
- **Recovery**: Email-based verification

### Admin Pattern (admin.thepia.net)
- **Users**: Managers and HR staff on corporate workstations
- **Auth Method**: Auth0 with corporate SSO/Active Directory
- **Session**: Short-lived tokens (4-hour max)
- **Access**: Cross-employee data with role-based filtering
- **Recovery**: IT department managed

## Implementing Admin Authentication with flows-auth

### 1. Configuration for Admin Applications

```typescript
import { createAuthStore } from '@thepia/flows-auth';

// Admin-specific configuration
const adminAuthStore = createAuthStore({
  // API configuration
  apiBaseUrl: 'https://api.thepia.com',
  domain: 'admin.thepia.net',
  clientId: 'admin-thepia-net',
  
  // Disable passkeys for corporate workstations
  enablePasskeys: false,
  
  // Use magic links as backup only
  enableMagicLinks: true,
  
  // Enable corporate SSO
  enableSocialLogin: true,
  socialProviders: ['microsoft', 'google-workspace'],
  
  // Short session timeout for security
  sessionTimeout: 4 * 60 * 60 * 1000, // 4 hours
  
  // Admin-specific branding
  branding: {
    companyName: 'Thepia Admin Portal',
    showPoweredBy: false,
    theme: 'corporate'
  },
  
  // Role validation
  requiredRoles: ['manager', 'hr_admin', 'thepia_staff'],
  
  // Email domain restrictions
  allowedEmailDomains: ['thepia.com', 'client-company.com']
});
```

### 2. Custom Sign-In Form for Admins

```svelte
<!-- AdminSignIn.svelte -->
<script lang="ts">
  import { SignInForm } from '@thepia/flows-auth';
  import { onMount } from 'svelte';
  
  export let authStore;
  
  // Custom validation for admin users
  function validateAdminEmail(email: string): boolean {
    const domain = email.split('@')[1];
    const allowedDomains = ['thepia.com', 'client-company.com'];
    return allowedDomains.includes(domain);
  }
  
  // Handle successful authentication
  async function handleAuthSuccess(event) {
    const { user, token } = event.detail;
    
    // Exchange Auth0 token for Supabase access
    const response = await fetch('/api/auth/exchange-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const { supabase_token } = await response.json();
      // Store token and redirect to admin dashboard
      sessionStorage.setItem('supabase_token', supabase_token);
      window.location.href = '/admin/dashboard';
    }
  }
</script>

<SignInForm
  {authStore}
  emailValidator={validateAdminEmail}
  on:success={handleAuthSuccess}
  customMessages={{
    title: 'Admin Portal Sign In',
    subtitle: 'Use your corporate credentials',
    emailPlaceholder: 'manager@company.com',
    invalidDomain: 'Please use your corporate email address'
  }}
  hidePasskeyOption={true}
  showSSOButtons={true}
/>
```

### 3. Auth Store Extensions for Admin Features

```typescript
// lib/auth/admin-auth-store.ts
import { createAuthStore, type AuthStore } from '@thepia/flows-auth';
import { writable, derived } from 'svelte/store';

export interface AdminAuthStore extends AuthStore {
  roles: Readable<string[]>;
  permissions: Readable<string[]>;
  companyId: Readable<string | null>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

export function createAdminAuthStore(config): AdminAuthStore {
  const baseStore = createAuthStore(config);
  
  // Extend with admin-specific state
  const roles = derived(baseStore.user, ($user) => 
    $user?.app_metadata?.roles || []
  );
  
  const permissions = derived(baseStore.user, ($user) => 
    $user?.app_metadata?.permissions || []
  );
  
  const companyId = derived(baseStore.user, ($user) => 
    $user?.app_metadata?.company_id || null
  );
  
  // Helper methods for authorization
  const hasPermission = (permission: string): boolean => {
    const $permissions = get(permissions);
    return $permissions.includes(permission);
  };
  
  const hasRole = (role: string): boolean => {
    const $roles = get(roles);
    return $roles.includes(role);
  };
  
  return {
    ...baseStore,
    roles,
    permissions,
    companyId,
    hasPermission,
    hasRole
  };
}
```

### 4. Protected Route Component

```svelte
<!-- AdminRoute.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { AdminAuthStore } from '$lib/auth/admin-auth-store';
  
  export let authStore: AdminAuthStore;
  export let requiredRole: string | undefined = undefined;
  export let requiredPermission: string | undefined = undefined;
  
  let isAuthorized = false;
  let isLoading = true;
  
  onMount(async () => {
    // Check authentication
    const $isAuthenticated = authStore.isAuthenticated;
    
    if (!$isAuthenticated) {
      goto('/login');
      return;
    }
    
    // Check authorization
    if (requiredRole && !authStore.hasRole(requiredRole)) {
      goto('/unauthorized');
      return;
    }
    
    if (requiredPermission && !authStore.hasPermission(requiredPermission)) {
      goto('/unauthorized');
      return;
    }
    
    isAuthorized = true;
    isLoading = false;
  });
</script>

{#if isLoading}
  <div>Checking authorization...</div>
{:else if isAuthorized}
  <slot />
{:else}
  <div>Access denied</div>
{/if}
```

## Integration with Supabase

### 1. Token Exchange Flow

```typescript
// lib/auth/supabase-bridge.ts
import { createClient } from '@supabase/supabase-js';
import type { AdminAuthStore } from './admin-auth-store';

export class SupabaseBridge {
  private client: SupabaseClient | null = null;
  private authStore: AdminAuthStore;
  
  constructor(authStore: AdminAuthStore) {
    this.authStore = authStore;
    
    // Subscribe to auth changes
    authStore.subscribe(async ($store) => {
      if ($store.isAuthenticated && $store.user) {
        await this.initializeSupabase($store.token);
      } else {
        this.cleanup();
      }
    });
  }
  
  private async initializeSupabase(auth0Token: string) {
    // Exchange Auth0 token for Supabase token
    const response = await fetch('https://api.thepia.com/auth/exchange-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${auth0Token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to exchange token');
    }
    
    const { supabase_token } = await response.json();
    
    // Create Supabase client with custom token
    this.client = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${supabase_token}`
          }
        }
      }
    );
  }
  
  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }
    return this.client;
  }
  
  private cleanup() {
    if (this.client) {
      this.client.auth.signOut();
      this.client = null;
    }
  }
}
```

### 2. Using the Bridge in Components

```svelte
<!-- EmployeeList.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { SupabaseBridge } from '$lib/auth/supabase-bridge';
  
  export let authStore: AdminAuthStore;
  
  let employees = [];
  let loading = true;
  
  const bridge = new SupabaseBridge(authStore);
  
  onMount(async () => {
    try {
      const supabase = bridge.getClient();
      
      // Query will be filtered by RLS based on token claims
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          name,
          email,
          department,
          status,
          onboarding_progress
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      employees = data;
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      loading = false;
    }
  });
</script>

{#if loading}
  <div>Loading employees...</div>
{:else}
  <table>
    {#each employees as employee}
      <tr>
        <td>{employee.name}</td>
        <td>{employee.email}</td>
        <td>{employee.department}</td>
        <td>{employee.status}</td>
      </tr>
    {/each}
  </table>
{/if}
```

## Security Best Practices

### 1. Session Management

```typescript
// lib/auth/session-manager.ts
export class AdminSessionManager {
  private readonly MAX_SESSION_DURATION = 4 * 60 * 60 * 1000; // 4 hours
  private readonly WARNING_THRESHOLD = 15 * 60 * 1000; // 15 minutes
  
  constructor(private authStore: AdminAuthStore) {
    this.setupSessionMonitoring();
  }
  
  private setupSessionMonitoring() {
    // Monitor for session expiry
    setInterval(() => {
      const sessionAge = Date.now() - this.authStore.sessionStartTime;
      const timeRemaining = this.MAX_SESSION_DURATION - sessionAge;
      
      if (timeRemaining < 0) {
        // Force logout
        this.authStore.logout();
        window.location.href = '/session-expired';
      } else if (timeRemaining < this.WARNING_THRESHOLD) {
        // Show warning
        this.showExpiryWarning(timeRemaining);
      }
    }, 60000); // Check every minute
    
    // Monitor for inactivity
    this.setupInactivityMonitor();
  }
  
  private setupInactivityMonitor() {
    let lastActivity = Date.now();
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    
    // Track user activity
    ['mousedown', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, () => {
        lastActivity = Date.now();
      });
    });
    
    // Check for inactivity
    setInterval(() => {
      if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        this.authStore.logout();
        window.location.href = '/inactive-logout';
      }
    }, 60000);
  }
}
```

### 2. Audit Logging

```typescript
// lib/auth/audit-logger.ts
export class AdminAuditLogger {
  constructor(private supabase: SupabaseClient) {}
  
  async logAction(action: {
    type: 'view' | 'create' | 'update' | 'delete';
    resource: string;
    resourceId?: string;
    metadata?: Record<string, any>;
  }) {
    const { error } = await this.supabase
      .from('admin_audit_log')
      .insert({
        action_type: action.type,
        resource_type: action.resource,
        resource_id: action.resourceId,
        metadata: action.metadata,
        user_id: this.getCurrentUserId(),
        timestamp: new Date().toISOString()
      });
    
    if (error) {
      console.error('Failed to log audit action:', error);
    }
  }
  
  async logBulkAction(action: {
    type: string;
    affectedCount: number;
    filters: Record<string, any>;
  }) {
    await this.logAction({
      type: 'update',
      resource: 'bulk_operation',
      metadata: {
        operation: action.type,
        affected_count: action.affectedCount,
        filters: action.filters
      }
    });
  }
}
```

## Testing Admin Authentication

### 1. Mock Admin Store for Testing

```typescript
// lib/auth/mock-admin-store.ts
export function createMockAdminStore(overrides = {}) {
  return {
    isAuthenticated: writable(true),
    user: writable({
      id: 'auth0|test123',
      email: 'manager@thepia.com',
      app_metadata: {
        roles: ['manager', 'hr_admin'],
        permissions: ['read:employees', 'manage:invitations'],
        company_id: 'comp_test123',
        ...overrides.app_metadata
      }
    }),
    hasRole: (role: string) => {
      const roles = overrides.app_metadata?.roles || ['manager'];
      return roles.includes(role);
    },
    hasPermission: (permission: string) => {
      const permissions = overrides.app_metadata?.permissions || [];
      return permissions.includes(permission);
    },
    ...overrides
  };
}
```

### 2. Testing Authorization Logic

```typescript
// tests/admin-auth.test.ts
import { describe, it, expect } from 'vitest';
import { createMockAdminStore } from '$lib/auth/mock-admin-store';

describe('Admin Authorization', () => {
  it('should allow managers to view employees', () => {
    const store = createMockAdminStore({
      app_metadata: {
        roles: ['manager'],
        permissions: ['read:employees']
      }
    });
    
    expect(store.hasRole('manager')).toBe(true);
    expect(store.hasPermission('read:employees')).toBe(true);
  });
  
  it('should deny access without proper role', () => {
    const store = createMockAdminStore({
      app_metadata: {
        roles: ['employee'],
        permissions: []
      }
    });
    
    expect(store.hasRole('manager')).toBe(false);
    expect(store.hasPermission('manage:invitations')).toBe(false);
  });
});
```

## Migration from Demo Data

### Step-by-step Migration

1. **Phase 1: Parallel Running**
   ```typescript
   // Use feature flag to toggle between demo and live data
   const useSupabase = import.meta.env.VITE_USE_SUPABASE === 'true';
   
   const dataSource = useSupabase 
     ? new SupabaseDataSource(bridge.getClient())
     : new DemoDataSource();
   ```

2. **Phase 2: Gradual Rollout**
   ```typescript
   // Roll out to specific users/companies first
   const pilotCompanies = ['comp_abc123', 'comp_def456'];
   const useLiveData = pilotCompanies.includes(authStore.companyId);
   ```

3. **Phase 3: Full Migration**
   ```typescript
   // Remove demo data code
   const dataSource = new SupabaseDataSource(bridge.getClient());
   ```

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: "Token exchange failed"
**Causes:**
- Auth0 token expired
- User lacks admin role
- API endpoint down

**Solution:**
```typescript
// Add retry logic with exponential backoff
async function exchangeTokenWithRetry(auth0Token: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await exchangeToken(auth0Token);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

#### Issue: "Supabase queries return empty"
**Causes:**
- RLS policies blocking access
- Company ID mismatch
- Token claims missing

**Debug:**
```typescript
// Log token claims for debugging
const token = parseJWT(supabase_token);
console.log('Token claims:', {
  company_id: token.company_id,
  roles: token.roles,
  exp: new Date(token.exp * 1000)
});
```

## Performance Optimization

### 1. Token Caching

```typescript
// Cache tokens in session storage
const TOKEN_CACHE_KEY = 'admin_supabase_token';

async function getCachedOrExchangeToken(auth0Token: string) {
  // Check cache first
  const cached = sessionStorage.getItem(TOKEN_CACHE_KEY);
  if (cached) {
    const { token, expires } = JSON.parse(cached);
    if (Date.now() < expires - 60000) { // 1 min buffer
      return token;
    }
  }
  
  // Exchange for new token
  const result = await exchangeToken(auth0Token);
  
  // Cache the result
  sessionStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify({
    token: result.supabase_token,
    expires: Date.now() + (result.expires_in * 1000)
  }));
  
  return result.supabase_token;
}
```

### 2. Prefetch Critical Data

```typescript
// Prefetch data during authentication
async function handleAuthSuccess(event) {
  const { token } = event.detail;
  
  // Start token exchange immediately
  const exchangePromise = exchangeToken(token);
  
  // Prefetch critical data in parallel
  const [supabaseToken, companyConfig, userPreferences] = await Promise.all([
    exchangePromise,
    fetchCompanyConfig(),
    fetchUserPreferences()
  ]);
  
  // Navigate with data ready
  navigate('/dashboard', { 
    preloadedData: { companyConfig, userPreferences } 
  });
}
```

## Related Documentation

- [Authentication Components](./authentication-components.md)
- [WebAuthn Implementation](./webauthn-implementation.md)
- [State Machine Architecture](./state-machine-architecture.md)
- [API Integration Guide](./api-integration.md)
- [Security Best Practices](./security-best-practices.md)
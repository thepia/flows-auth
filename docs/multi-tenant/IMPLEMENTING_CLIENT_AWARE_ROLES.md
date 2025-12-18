# Implementing Client-Aware Role Assignment

## ✅ Status: Already Implemented

Your codebase already has the recommended multi-tenant JWT role assignment pattern! This guide documents what's in place and what may need enhancement.

## Current Architecture

```
Sign-In Request
    ↓
Normalize Auth Result (from Auth0/WorkOS)
    ↓
Build Supabase Token Claims
    ├─ Check metadata.role (override) ✅
    ├─ Check email domain (@thepia.com) ✅
    └─ Include basic claims
    ↓
Generate JWT Token
    ├─ Create/verify Supabase Auth user ✅
    ├─ Query user_roles table ✅
    ├─ Enrich claims with role, client_id, employee_id ✅
    └─ Generate token with enriched claims ✅
    ↓
Return to Client
```

## What's Already Implemented

### 1. Three-Tier Role Fallback ✅

**File**: `src/api/utils/auth-response-helpers.ts`

```typescript
export function extractUserRole(
  metadata?: Record<string, unknown>,
  email?: string
): string {
  // 1. Explicit role in metadata
  if (metadata && typeof metadata === "object" && "role" in metadata) {
    const role = metadata.role;
    if (typeof role === "string") {
      return role;
    }
  }

  // 2. Email domain check
  if (email?.endsWith("@thepia.com")) {
    return "thepia_staff";
  }

  // 3. Default
  return "authenticated";
}
```

### 2. Database Role Lookup ✅

**File**: `src/api/utils/supabase-token-exchange.ts` (lines 143-175)

The `fetchUserRoleData()` function already queries `user_roles` table and returns enriched claims.

### 3. JWT Claims Enrichment ✅

**File**: `src/api/utils/supabase-token-exchange.ts` (lines 266-268)

Role data is fetched and included in JWT during token generation.

## What Needs Enhancement

### 1. Client-Specific Role Lookup (Partial)

**Current State**: Database lookup queries `user_roles` table but doesn't filter by `client_id`.

**Issue**: The `fetchUserRoleData()` function uses `.single()` which assumes one role per user, but in multi-tenant systems, a user can have different roles in different clients.

**Recommendation**: Enhance to support client-specific lookups:

```typescript
// Current (line 154-156 in supabase-token-exchange.ts):
const { data: roleData, error } = await admin
  .from('user_roles')
  .select('role, client_id, employee_id, department, access_level')
  .eq('thepia_user_id', thepia_user_id)
  .single();  // ← Assumes one role per user

// Should be (for multi-client support):
const { data: roleData, error } = await admin
  .from('user_roles')
  .select('role, client_id, employee_id, department, access_level')
  .eq('thepia_user_id', thepia_user_id)
  .eq('client_id', clientId)  // ← Add client context
  .single();
```

### 2. Client ID Mapping (Not Yet Implemented)

**Current State**: No mapping from `appCode` to `client_id`.

**Needed**: Create `src/api/config/app-client-mapping.ts` to map applications to their client IDs:

```typescript
/**
 * Maps application codes to Supabase client IDs
 * This bridges app routing to multi-tenant data isolation
 */
export const APP_CLIENT_MAPPING: Record<string, string> = {
  // Main products
  'flows': 'flows-client-uuid-here',
  'app': 'app-client-uuid-here',
  'rt': 'recordthing-client-uuid-here',

  // Customer portals
  'nets': 'nets-portal-client-uuid-here',
  'dab': 'dab-portal-client-uuid-here',

  // Demo/Admin
  'demo': 'demo-client-uuid-here',
  'admin': 'admin-client-uuid-here',
};

export function getClientIdForApp(appCode: string): string | undefined {
  return APP_CLIENT_MAPPING[appCode];
}
```

### 3. Pass Client ID to Token Generation (Not Yet Implemented)

**Current State**: `generateSupabaseTokenForUser()` doesn't receive or use `client_id`.

**Needed**: Update to pass `client_id` from `appCode` mapping:

```typescript
// In src/api/app/email-signin.ts, update generateSupabaseTokenForUser signature:
async function generateSupabaseTokenForUser(
  user: ReturnType<typeof normalizeAuthResult>,
  organization: { code: string; name: string; provider: string },
  appCode: string,
  clientId?: string  // ← Add client context
): Promise<{ token: string; expiresAt: number } | undefined> {
  // ... implementation
}
```

## Implementation Steps

### Step 1: Create App-to-Client Mapping

**File**: `src/api/config/app-client-mapping.ts` (NEW)

```typescript
/**
 * Maps application codes to Supabase client IDs
 * This bridges app routing to multi-tenant data isolation
 */
export const APP_CLIENT_MAPPING: Record<string, string> = {
  // Main products
  'flows': 'flows-client-uuid-here',
  'app': 'app-client-uuid-here',
  'rt': 'recordthing-client-uuid-here',

  // Customer portals
  'nets': 'nets-portal-client-uuid-here',
  'dab': 'dab-portal-client-uuid-here',

  // Demo/Admin
  'demo': 'demo-client-uuid-here',
  'admin': 'admin-client-uuid-here',
};

export function getClientIdForApp(appCode: string): string | undefined {
  return APP_CLIENT_MAPPING[appCode];
}
```

### Step 2: Enhance fetchUserRoleData for Client Context

**File**: `src/api/utils/supabase-token-exchange.ts` (MODIFY lines 143-175)

Add `clientId` parameter to support multi-client role lookups:

```typescript
async function fetchUserRoleData(
  thepia_user_id: string,
  clientId?: string  // ← Add client context
): Promise<Partial<SupabaseTokenClaims>> {
  if (!thepia_user_id) return {};

  try {
    const admin = getSupabaseAdmin();

    let query = admin
      .from('user_roles')
      .select('role, client_id, employee_id, department, access_level')
      .eq('thepia_user_id', thepia_user_id);

    // If clientId provided, filter to that client
    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data: roleData, error } = await query.single();

    if (error || !roleData) {
      console.log(`ℹ️  No role data found for thepia_user_id: ${thepia_user_id}${clientId ? ` (client: ${clientId})` : ''}`);
      return {};
    }

    console.log(`✅ Found role data for ${thepia_user_id}:`, roleData);

    return {
      role: roleData.role as string,
      client_id: roleData.client_id as string,
      employee_id: roleData.employee_id as string,
      department: roleData.department as string,
      access_level: roleData.access_level as 'full' | 'department' | 'personal' | 'read_only'
    };
  } catch (error) {
    console.warn(`⚠️ Failed to fetch role data for ${thepia_user_id}:`, error);
    return {};
  }
}
```

### Step 3: Update Token Generation to Pass Client ID

**File**: `src/api/utils/supabase-token-exchange.ts` (MODIFY line 267)

Update the call to `fetchUserRoleData()` to pass client ID:

```typescript
// Before (line 267):
const roleData = user.thepia_user_id ? await fetchUserRoleData(user.thepia_user_id) : {};

// After:
const roleData = user.thepia_user_id ? await fetchUserRoleData(user.thepia_user_id, user.client_id) : {};
```

### Step 4: Update Email Sign-In Handler

**File**: `src/api/app/email-signin.ts` (MODIFY lines 36-66)

Update `generateSupabaseTokenForUser()` to pass client ID:

```typescript
import { getClientIdForApp } from '../config/app-client-mapping.ts';

async function generateSupabaseTokenForUser(
  user: ReturnType<typeof normalizeAuthResult>,
  organization: { code: string; name: string; provider: string },
  appCode: string,
): Promise<{ token: string; expiresAt: number } | undefined> {
  try {
    // Get client_id from app mapping
    const clientId = getClientIdForApp(appCode);

    // Build token parameters with client context
    const tokenParams = buildSupabaseTokenParams(user, organization);

    // Add client_id if available
    if (clientId) {
      tokenParams.client_id = clientId;
    }

    // Log role determination for debugging
    const roleSource = user.metadata?.role ? "metadata" : user.email.endsWith("@thepia.com") ? "email domain" : "default";
    console.log(
      `🔍 [${appCode}] User role for ${user.email}: "${tokenParams.role}" (from ${roleSource})${clientId ? ` (client: ${clientId})` : ''}`
    );

    // Generate the token
    const token = await generateSupabaseAuthToken(tokenParams);
    const expiresAt = getSupabaseTokenExpiration();

    console.log(`✅ [${appCode}] Supabase JWT generated successfully`);

    return { token, expiresAt };
  } catch (error) {
    console.error(
      `⚠️ [${appCode}] Supabase JWT generation failed:`,
      error instanceof Error ? error.message : String(error)
    );
    return undefined;
  }
}
```

## Configuration Checklist

- [ ] Create `src/api/config/app-client-mapping.ts` with all appCode → client_id mappings
- [ ] Verify `user_roles` table has correct data for all users and clients
- [ ] Update `fetchUserRoleData()` to accept and use `clientId` parameter
- [ ] Update token generation to pass `client_id` from app mapping
- [ ] Test role resolution with database lookups for different clients
- [ ] Verify RLS policies correctly check `client_id` from JWT
- [ ] Monitor JWT generation performance
- [ ] Set up alerts for role lookup failures

## Testing

Existing tests in `tests/deno/auth-response-helpers.test.ts` and `tests/deno/email-signin-supabase-token.test.ts` already cover role determination. Add tests for client-specific lookups:

```typescript
Deno.test("fetchUserRoleData - returns role for specific client", async () => {
  // Test that role lookup filters by client_id
  // Verify different roles for same user in different clients
});
```

## Performance Considerations

- Database lookup adds ~5-10ms per sign-in
- Consider caching for high-volume scenarios
- Monitor Supabase query performance
- Use indexes on `user_roles(thepia_user_id, client_id)` for fast lookups


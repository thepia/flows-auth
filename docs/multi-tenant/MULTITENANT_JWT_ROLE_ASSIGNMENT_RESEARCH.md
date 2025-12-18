# Multi-Tenant JWT Role Assignment: Best Practices & Research

## Executive Summary

For SaaS multi-client applications, **role lookup from the database at JWT generation time is the industry best practice**. This ensures:
- **Accurate, up-to-date roles** reflecting current user permissions
- **Client-specific role context** (employee vs manager per client)
- **Compliance with RLS policies** that depend on role + client_id
- **Scalability** without JWT bloat or stale data issues

## ✅ Current Implementation Status

**Good news**: Your codebase **already implements database role lookup**!

### What's Already Implemented
- ✅ `fetchUserRoleData()` in `src/api/utils/supabase-token-exchange.ts` queries `user_roles` table
- ✅ Three-tier role fallback in `extractUserRole()` (metadata → email domain → default)
- ✅ JWT claims include `role`, `client_id`, `employee_id`, `department`, `access_level`
- ✅ Role data enrichment during token generation
- ✅ Comprehensive test coverage for role determination

### Your Setup
- **Primary Auth**: Auth0/WorkOS via `thepia_user_id` (stable identity)
- **JWT Claims**: Include `role`, `client_id`, `app_code`, `employee_id`, `department`, `access_level`
- **RLS Policies**: Check `auth.jwt()->>'role'` and `auth.jwt()->>'client_id'`
- **User Roles Table**: `api.user_roles` with three-tier system (thepia_staff, client_manager, client_employee)
- **Database Lookup**: Already implemented via `fetchUserRoleData()` function

### Key Insight
Your `user_roles` table already supports the multi-client pattern:

```sql
CREATE TABLE api.user_roles (
  thepia_user_id TEXT UNIQUE,
  role TEXT CHECK (role IN ('thepia_staff', 'client_manager', 'client_employee')),
  client_id UUID REFERENCES api.clients(id),  -- ← Client-specific role
  employee_id UUID,
  department TEXT,
  access_level TEXT CHECK (access_level IN ('full', 'department', 'personal', 'read_only'))
);
```

## Current Implementation Details

### 1. Role Determination Flow (Already Implemented)

**File**: `src/api/utils/auth-response-helpers.ts`

The three-tier fallback is already in place:

```typescript
export function extractUserRole(
  metadata?: Record<string, unknown>,
  email?: string
): string {
  // 1. Explicit role in metadata (highest priority)
  if (metadata && typeof metadata === "object" && "role" in metadata) {
    const role = metadata.role;
    if (typeof role === "string") {
      return role;
    }
  }

  // 2. Thepia staff (email domain)
  if (email?.endsWith("@thepia.com")) {
    return "thepia_staff";
  }

  // 3. Default fallback
  return "authenticated";
}
```

### 2. Database Role Lookup (Already Implemented)

**File**: `src/api/utils/supabase-token-exchange.ts` (lines 143-175)

The `fetchUserRoleData()` function queries the `user_roles` table:

```typescript
async function fetchUserRoleData(thepia_user_id: string): Promise<Partial<SupabaseTokenClaims>> {
  if (!thepia_user_id) return {};

  try {
    const admin = getSupabaseAdmin();

    const { data: roleData, error } = await admin
      .from('user_roles')
      .select('role, client_id, employee_id, department, access_level')
      .eq('thepia_user_id', thepia_user_id)
      .single();

    if (error || !roleData) {
      console.log(`ℹ️  No role data found for thepia_user_id: ${thepia_user_id}`);
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

### 3. JWT Claims Enrichment (Already Implemented)

**File**: `src/api/utils/supabase-token-exchange.ts` (lines 266-268)

During token generation, role data is fetched and enriched:

```typescript
// Fetch additional role data from user_roles table
const roleData = user.thepia_user_id ? await fetchUserRoleData(user.thepia_user_id) : {};
console.log(`📋 Role data for JWT:`, roleData);
```

The enriched data is then included in the JWT claims passed to the magic link generation.

## SaaS Best Practices (Industry Standard)

### 1. **Database Lookup at Token Generation Time**

**Why**: Roles are dynamic and context-dependent in multi-tenant systems.

**Pattern**:
```typescript
// At JWT generation (email-signin, refresh, etc.)
async function enrichUserWithRoles(
  thepia_user_id: string,
  client_id: string  // ← From appCode mapping
): Promise<EnrichedUser> {
  // Query user_roles table for this user + client combination
  const roleData = await supabase
    .from('user_roles')
    .select('role, client_id, employee_id, department, access_level')
    .eq('thepia_user_id', thepia_user_id)
    .eq('client_id', client_id)  // ← Client-specific lookup
    .single();

  return {
    role: roleData.role,           // e.g., 'client_manager'
    client_id: roleData.client_id,
    employee_id: roleData.employee_id,
    department: roleData.department,
    access_level: roleData.access_level
  };
}
```

### 2. **Three-Tier Role Fallback (Your Current Pattern)**

**Hierarchy**:
1. **Explicit role in metadata** → Use it (e.g., 'admin' override)
2. **Email domain check** → @thepia.com → 'thepia_staff'
3. **Database lookup** → Query user_roles for client-specific role
4. **Default** → 'authenticated'

**Why this works**:
- Thepia staff get global access (thepia_staff role)
- Regular users get client-specific roles from database
- Metadata can override for special cases

### 3. **Client Context in JWT Claims**

**Include in JWT**:
```typescript
const claims: SupabaseTokenClaims = {
  id: user.id,
  email: user.email,
  role: enrichedUser.role,              // From database lookup
  client_id: enrichedUser.client_id,    // For RLS filtering
  app_code: appCode,                    // For audit/logging
  employee_id: enrichedUser.employee_id,
  department: enrichedUser.department,
  access_level: enrichedUser.access_level
};
```

**RLS Policy Example**:
```sql
-- Client employees can only see their own client's data
CREATE POLICY policy_data_client_access ON api.data
  FOR SELECT
  USING (
    (auth.jwt()->>'role' = 'thepia_staff') OR
    (auth.jwt()->>'client_id'::UUID = client_id AND 
     auth.jwt()->>'role' IN ('client_manager', 'client_employee'))
  );
```

## Supabase-Specific Recommendations

### 1. **Use Security Definer Functions for Role Lookup**

**Why**: Bypasses RLS on user_roles table during token generation.

```sql
CREATE OR REPLACE FUNCTION api.get_user_role_for_client(
  p_thepia_user_id TEXT,
  p_client_id UUID
)
RETURNS TABLE(role TEXT, employee_id UUID, department TEXT, access_level TEXT)
LANGUAGE plpgsql
SECURITY DEFINER  -- ← Runs as creator (bypasses RLS)
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ur.role,
    ur.employee_id,
    ur.department,
    ur.access_level
  FROM api.user_roles ur
  WHERE ur.thepia_user_id = p_thepia_user_id
    AND ur.client_id = p_client_id;
END;
$$;
```

### 2. **Cache Role Lookups (Optional)**

For high-volume scenarios, cache role data briefly:
- **TTL**: 5-15 minutes (balance between freshness and performance)
- **Key**: `user_roles:{thepia_user_id}:{client_id}`
- **Invalidate on**: Role changes via admin API

### 3. **Avoid JWT Bloat**

**Don't include**:
- Full user object
- All permissions as arrays
- Nested metadata structures

**Do include**:
- Minimal claims needed for RLS (role, client_id, employee_id)
- Audit fields (app_code, issued_at)
- Let RLS policies query additional data as needed

## Implementation Roadmap

### Phase 1: Current State (Already Done)
✅ Three-tier role fallback (metadata → email domain → default)
✅ Basic role determination in `extractUserRole()`
✅ JWT includes role + client_id

### Phase 2: Database-Aware Role Lookup (Recommended)
```typescript
async function generateSupabaseTokenForUser(
  user: ReturnType<typeof normalizeAuthResult>,
  organization: { code: string; name: string; provider: string },
  appCode: string,
  clientId?: string  // ← Add client context
): Promise<{ token: string; expiresAt: number } | undefined> {
  try {
    // 1. Check for explicit role in metadata (override)
    if (user.metadata?.role) {
      const tokenParams = buildSupabaseTokenParams(user, organization);
      // ... generate token
    }

    // 2. Check if thepia_staff (email domain)
    if (user.email.endsWith('@thepia.com')) {
      // ... generate token with thepia_staff role
    }

    // 3. Look up client-specific role from database
    if (clientId) {
      const roleData = await lookupUserRoleForClient(
        user.metadata?.thepia_user_id,
        clientId
      );
      if (roleData) {
        // ... generate token with database role
      }
    }

    // 4. Default to authenticated
    // ... generate token with authenticated role
  } catch (error) {
    console.error(`JWT generation failed:`, error);
    return undefined;
  }
}
```

### Phase 3: Client-Specific Onboarding
- Map appCode → client_id at sign-in time
- Store client_id in session/metadata
- Pass to token generation function

## Comparison: Approaches

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **Metadata Only** | Fast, no DB lookup | Stale data, manual updates | Simple apps, single role per user |
| **Email Domain** | Simple, automatic | Limited flexibility | Internal staff only |
| **Database Lookup** | Fresh, context-aware, scalable | Slight latency | Multi-tenant SaaS ✅ |
| **Hybrid (Current)** | Flexible, fallback chain | Complexity | Enterprise SaaS ✅ |

## Security Considerations

### 1. **Never Trust Client-Provided Role**
- Always validate role from database/metadata
- Never accept role from request body

### 2. **Use app_metadata for Authorization**
- Auth0/WorkOS: Store role in `app_metadata` (not user_metadata)
- Supabase: Store in `raw_app_meta_data` (immutable)
- User cannot modify via SDK

### 3. **RLS as Defense in Depth**
- JWT role is first line of defense
- RLS policies are second line
- Never rely on JWT alone

### 4. **Audit Trail**
- Log role assignments in user_roles table
- Track who assigned roles and when
- Include in compliance reports

## Recommended Implementation

### For Your Architecture:

```typescript
// src/api/utils/role-resolution.ts
export async function resolveUserRole(
  user: NormalizedUser,
  appCode: string,
  clientId?: string
): Promise<{
  role: string;
  source: 'metadata' | 'email_domain' | 'database' | 'default';
  clientId?: string;
}> {
  // 1. Explicit metadata role (highest priority)
  if (user.metadata?.role) {
    return {
      role: user.metadata.role,
      source: 'metadata'
    };
  }

  // 2. Thepia staff (email domain)
  if (user.email.endsWith('@thepia.com')) {
    return {
      role: 'thepia_staff',
      source: 'email_domain'
    };
  }

  // 3. Database lookup for client-specific role
  if (clientId && user.metadata?.thepia_user_id) {
    try {
      const roleData = await getSupabaseAdmin()
        .from('user_roles')
        .select('role')
        .eq('thepia_user_id', user.metadata.thepia_user_id)
        .eq('client_id', clientId)
        .single();

      if (roleData.data?.role) {
        return {
          role: roleData.data.role,
          source: 'database',
          clientId
        };
      }
    } catch (error) {
      console.warn(`Database role lookup failed:`, error);
    }
  }

  // 4. Default fallback
  return {
    role: 'authenticated',
    source: 'default'
  };
}
```

## References

- **Supabase RLS Best Practices**: https://supabase.com/docs/guides/database/postgres/row-level-security
- **SaaS IAM Best Practices**: LoginRadius Partner IAM patterns (multi-tenant, delegated admin, JIT provisioning)
- **JWT Security**: Never store sensitive data; use claims for RLS filtering only
- **Your Schema**: `api.user_roles` already supports this pattern perfectly

## Next Steps

1. **Implement database role lookup** in `generateSupabaseTokenForUser()`
2. **Add client_id mapping** from appCode in sign-in flow
3. **Update tests** to verify role resolution with database lookups
4. **Monitor performance** of role lookups (add caching if needed)
5. **Document role assignment workflow** for admin operations


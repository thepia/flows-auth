# Organization Membership Detection - Implementation Code

## File 1: Create `src/api/utils/org-membership.ts`

```typescript
/**
 * Organization Membership Detection
 * 
 * Handles checking if a user belongs to a specific organization
 * in both Auth0 and WorkOS systems.
 * 
 * Key insight: Users can belong to MULTIPLE organizations
 * - Auth0: Memberships stored separately, not in user object
 * - WorkOS: Can have primary org + multiple memberships
 */

import { auth0Client } from "./auth0-management-server.ts";
import { workosRequest } from "../workos.ts";

/**
 * Get all organization IDs a user belongs to
 * 
 * @param userId - User ID from auth provider
 * @param provider - 'auth0' or 'workos'
 * @returns Array of organization IDs user is member of
 */
export async function getUserOrganizationIds(
  userId: string,
  provider: 'auth0' | 'workos'
): Promise<string[]> {
  if (provider === 'auth0') {
    return await getAuth0UserOrganizations(userId);
  } else {
    return await getWorkOSUserOrganizations(userId);
  }
}

/**
 * Get Auth0 organizations for a user
 * 
 * Auth0 stores organization memberships separately from user object.
 * This queries the Management API to get all organizations the user belongs to.
 * 
 * API: GET /api/v2/users/{user_id}/organizations
 */
async function getAuth0UserOrganizations(userId: string): Promise<string[]> {
  try {
    console.log(`🔍 Fetching Auth0 organizations for user: ${userId}`);
    
    const response = await auth0Client.getUserOrganizations(userId);
    
    if (!Array.isArray(response)) {
      console.warn(`⚠️ Auth0 getUserOrganizations returned non-array:`, response);
      return [];
    }

    const orgIds = response.map((org: { id: string }) => org.id);
    console.log(`✅ Found ${orgIds.length} Auth0 organizations for user ${userId}:`, orgIds);
    
    return orgIds;
  } catch (error) {
    console.error(
      `❌ Failed to get Auth0 organizations for user ${userId}:`,
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
}

/**
 * Get WorkOS organizations for a user
 * 
 * WorkOS supports multiple organization memberships via the Organization Membership API.
 * This queries for all active memberships (pending and inactive are excluded).
 * 
 * API: GET /user_management/organization_memberships?user_id={user_id}
 */
async function getWorkOSUserOrganizations(userId: string): Promise<string[]> {
  try {
    console.log(`🔍 Fetching WorkOS organizations for user: ${userId}`);
    
    const response = await workosRequest(
      `/user_management/organization_memberships?user_id=${userId}`,
      { method: "GET" }
    );

    if (!response.data || !Array.isArray(response.data)) {
      console.warn(`⚠️ WorkOS organization_memberships returned invalid data:`, response);
      return [];
    }

    // Filter for active memberships only
    // Status can be: pending, active, inactive
    const activeMemberships = response.data.filter(
      (membership: { status: string }) => membership.status === 'active'
    );

    const orgIds = activeMemberships.map(
      (membership: { organization_id: string }) => membership.organization_id
    );

    console.log(
      `✅ Found ${orgIds.length} active WorkOS organizations for user ${userId}:`,
      orgIds
    );

    return orgIds;
  } catch (error) {
    console.error(
      `❌ Failed to get WorkOS organizations for user ${userId}:`,
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
}

/**
 * Check if a user is a member of a specific organization
 * 
 * @param userId - User ID from auth provider
 * @param provider - 'auth0' or 'workos'
 * @param organizationId - Organization ID to check membership for
 * @returns true if user is member of the organization
 */
export async function isUserMemberOfOrganization(
  userId: string,
  provider: 'auth0' | 'workos',
  organizationId: string
): Promise<boolean> {
  if (!organizationId) {
    console.warn(`⚠️ isUserMemberOfOrganization called with empty organizationId`);
    return false;
  }

  const userOrgIds = await getUserOrganizationIds(userId, provider);
  const isMember = userOrgIds.includes(organizationId);

  console.log(
    `🔍 User ${userId} membership check for org ${organizationId}: ${isMember ? '✅ MEMBER' : '❌ NOT MEMBER'}`
  );

  return isMember;
}
```

## File 2: Update `src/api/config/apps.ts`

Add `thepiaMemberOrgId` to Auth0 settings:

```typescript
export interface AppRouteConfig {
  code: string;
  name: string;
  provider: "auth0" | "workos";
  settings: {
    // Auth0 specific settings
    auth0?: {
      domain: string;
      clientId: string;
      managementClientId: string;
      managementClientSecret: string;
      audience?: string;
      // NEW: Thepia Organization ID for membership check
      thepiaMemberOrgId?: string;
    };
    // WorkOS specific settings
    workos?: {
      apiKey: string;
      clientId: string;
      organizationId?: string; // Thepia Org ID for WorkOS
      environment?: string;
    };
  };
  // ... rest of interface ...
}

// Example configuration:
export const APPS: Record<string, AppRouteConfig> = {
  app: {
    code: "app",
    name: "Thepia App",
    provider: "workos",
    settings: {
      workos: {
        apiKey: Deno.env.get("WORKOS_API_KEY") || "",
        clientId: Deno.env.get("WORKOS_CLIENT_ID") || "",
        organizationId: Deno.env.get("WORKOS_THEPIA_ORG") || "",
        environment: Deno.env.get("WORKOS_ENVIRONMENT") || "production",
      },
    },
    // ... rest of config ...
  },
  
  flows: {
    code: "flows",
    name: "Thepia Flows Platform",
    provider: "auth0",
    settings: {
      auth0: {
        domain: Deno.env.get("AUTH0_DOMAIN") || "",
        clientId: Deno.env.get("AUTH0_CLIENT_ID") || "",
        managementClientId: Deno.env.get("AUTH0_MANAGEMENT_CLIENT_ID") || "",
        managementClientSecret: Deno.env.get("AUTH0_MANAGEMENT_CLIENT_SECRET") || "",
        // NEW: Add Thepia Org ID from environment
        thepiaMemberOrgId: Deno.env.get("AUTH0_THEPIA_ORG_ID"),
      },
    },
    // ... rest of config ...
  },
};
```

## File 3: Update `src/api/app/email-signin.ts`

Update the `_handleVerifyEmail()` function:

```typescript
// In _handleVerifyEmail() function, replace the org membership check:

// OLD CODE (INCORRECT):
// const thepiaMemberOrgId = org.provider === "workos" 
//   ? org.settings.workos?.organizationId 
//   : undefined;
// const isThepiaMember = !!(thepiaMemberOrgId && authResult.user.metadata?.organization_id === thepiaMemberOrgId);

// NEW CODE (CORRECT):
import { isUserMemberOfOrganization } from "../utils/org-membership.ts";

// Get Thepia Org ID based on provider
const thepiaMemberOrgId = org.provider === "workos" 
  ? org.settings.workos?.organizationId 
  : org.settings.auth0?.thepiaMemberOrgId;

// Check if user is member of Thepia Org (if check is enabled)
let isThepiaMember = false;
if (thepiaMemberOrgId && enableThepiaMemberAdmin) {
  isThepiaMember = await isUserMemberOfOrganization(
    user.id,
    org.provider,
    thepiaMemberOrgId
  );
}

// Generate Supabase JWT token with configuration
const supabaseTokenResult = await generateSupabaseTokenForUser(
  user,
  organization,
  appCode,
  enableThepiaDomainAdmin,
  enableThepiaMemberAdmin,
  isThepiaMember
);
```

## Environment Variables Required

### For Auth0 Apps

Add to `.env`:
```bash
# Auth0 Thepia Organization ID
AUTH0_THEPIA_ORG_ID=org_abc123def456
```

### For WorkOS Apps

Already configured:
```bash
WORKOS_THEPIA_ORG=org_xyz789
```

## Key Differences from Previous Implementation

| Aspect | Old | New |
|--------|-----|-----|
| **Assumption** | User has single org | User can have multiple orgs |
| **Auth0 Check** | `metadata.organization_id` | API call to get user's orgs |
| **WorkOS Check** | `metadata.organization_id` | API call to get memberships |
| **Handles Multiple Orgs** | ❌ No | ✅ Yes |
| **Handles Inactive Memberships** | N/A | ✅ Filters them out |
| **Performance** | O(n*m) for Auth0 | O(1) for both |

## Testing

### Auth0 Test
```typescript
const userId = "auth0|user123";
const thepiaMemberOrgId = "org_abc123";

const isMember = await isUserMemberOfOrganization(
  userId,
  'auth0',
  thepiaMemberOrgId
);

console.log(isMember); // true or false
```

### WorkOS Test
```typescript
const userId = "user_xyz789";
const thepiaMemberOrgId = "org_thepia";

const isMember = await isUserMemberOfOrganization(
  userId,
  'workos',
  thepiaMemberOrgId
);

console.log(isMember); // true or false
```

## Logging Output

When checking membership, you'll see logs like:

```
🔍 Fetching Auth0 organizations for user: auth0|user123
✅ Found 2 Auth0 organizations for user auth0|user123: [ 'org_abc123', 'org_xyz789' ]
🔍 User auth0|user123 membership check for org org_abc123: ✅ MEMBER

🔍 Fetching WorkOS organizations for user: user_xyz789
✅ Found 1 active WorkOS organizations for user user_xyz789: [ 'org_thepia' ]
🔍 User user_xyz789 membership check for org org_thepia: ✅ MEMBER
```

## Error Handling

If API calls fail, the function returns an empty array and logs the error:

```
❌ Failed to get Auth0 organizations for user auth0|user123: Network error
```

This ensures the system gracefully degrades - if membership check fails, `isThepiaMember` defaults to `false`.


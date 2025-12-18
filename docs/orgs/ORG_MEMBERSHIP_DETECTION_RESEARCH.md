# Organization Membership Detection - Auth0 vs WorkOS

## Problem Statement

The current implementation assumes a user can only belong to ONE organization:
```typescript
const isThepiaMember = authResult.user.metadata?.organization_id === thepiaMemberOrgId;
```

This is **incorrect** because:
1. **Auth0**: Users can belong to multiple organizations
2. **WorkOS**: Users can belong to multiple organizations
3. A single `organization_id` field cannot represent multiple memberships

## Auth0 Organization Membership

### How Auth0 Stores Organization Membership

Auth0 does **NOT** store organization IDs in user metadata. Instead:

1. **Organization memberships are stored separately** in Auth0's organization system
2. **User object does NOT contain organization IDs** - you must query the Management API
3. **Multiple organizations**: A user can be a member of multiple organizations

### Auth0 API for Checking Membership

**Endpoint**: `GET /api/v2/users/{user_id}/organizations`

Returns a list of organizations the user belongs to:
```json
[
  {
    "id": "org_abc123",
    "name": "Thepia",
    "display_name": "Thepia Organization"
  },
  {
    "id": "org_xyz789",
    "name": "Other Org",
    "display_name": "Other Organization"
  }
]
```

### Current Codebase Usage

From `src/config/enhanced-domain-router.ts` (lines 206-231):
```typescript
private async checkExistingMembership(email: string): Promise<MembershipData | null> {
  const user = await auth0Client.findUserByEmail(email);
  if (!user) return null;

  // Check all organizations for this user
  for (const org of this.getAllOrganizations()) {
    try {
      const members = await auth0Client.getOrganizationMembers(org.id);
      const isMember = members.some(
        (member: { user_id: string }) => member.user_id === user.user_id
      );
      if (isMember) {
        return {
          userId: user.user_id,
          organizationId: org.id,
          joinedAt: user.created_at,
        };
      }
    } catch (orgError) {
      console.warn(`Failed to check membership for org ${org.id}:`, orgError);
    }
  }
  return null;
}
```

**This approach is inefficient** - it queries all organizations instead of querying the user's organizations.

### Better Auth0 Approach

```typescript
async function getUserOrganizations(userId: string): Promise<string[]> {
  try {
    const response = await auth0Client.getUserOrganizations(userId);
    return response.map((org: { id: string }) => org.id);
  } catch (error) {
    console.error(`Failed to get organizations for user ${userId}:`, error);
    return [];
  }
}

// Check if user is member of Thepia Org
const userOrgIds = await getUserOrganizations(user.user_id);
const isThepiaMember = userOrgIds.includes(thepiaMemberOrgId);
```

## WorkOS Organization Membership

### How WorkOS Stores Organization Membership

WorkOS has **two ways** to represent organization membership:

#### 1. Single Organization (Primary)
- User has a single `organization_id` field
- Returned in user object: `response.organization_id`
- Used for single-workspace apps

#### 2. Multiple Organizations (Organization Memberships)
- User can have multiple organization memberships
- Stored via Organization Membership API
- Each membership has status: `pending`, `active`, or `inactive`

### WorkOS API for Checking Membership

**Endpoint**: `GET /user_management/organization_memberships?user_id={user_id}`

Returns list of organization memberships:
```json
{
  "data": [
    {
      "id": "om_abc123",
      "user_id": "user_xyz",
      "organization_id": "org_thepia",
      "status": "active",
      "role": "admin"
    },
    {
      "id": "om_def456",
      "user_id": "user_xyz",
      "organization_id": "org_other",
      "status": "active",
      "role": "member"
    }
  ]
}
```

### Current Codebase Usage

From `src/api/workos.ts` (lines 635-640):
```typescript
metadata: {
  // Include any metadata from WorkOS
  ...response.user_metadata,
  // Include organization info if available
  ...(response.organization_id && { organization_id: response.organization_id }),
},
```

**This only captures the primary organization**, not all memberships.

### Better WorkOS Approach

```typescript
async function getUserOrganizationIds(userId: string): Promise<string[]> {
  try {
    const response = await workosRequest(
      `/user_management/organization_memberships?user_id=${userId}`,
      { method: "GET" }
    );
    
    // Filter for active memberships only
    return response.data
      .filter((membership: { status: string }) => membership.status === 'active')
      .map((membership: { organization_id: string }) => membership.organization_id);
  } catch (error) {
    console.error(`Failed to get organization memberships for user ${userId}:`, error);
    return [];
  }
}

// Check if user is member of Thepia Org
const userOrgIds = await getUserOrganizationIds(user.id);
const isThepiaMember = userOrgIds.includes(thepiaMemberOrgId);
```

## Implementation Strategy

### Step 1: Create Helper Functions

Create `src/api/utils/org-membership.ts`:

```typescript
/**
 * Get all organization IDs a user belongs to
 * Handles both Auth0 and WorkOS
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

async function getAuth0UserOrganizations(userId: string): Promise<string[]> {
  try {
    const response = await auth0Client.getUserOrganizations(userId);
    return response.map((org: { id: string }) => org.id);
  } catch (error) {
    console.error(`Failed to get Auth0 organizations for user ${userId}:`, error);
    return [];
  }
}

async function getWorkOSUserOrganizations(userId: string): Promise<string[]> {
  try {
    const response = await workosRequest(
      `/user_management/organization_memberships?user_id=${userId}`,
      { method: "GET" }
    );
    
    return response.data
      .filter((membership: { status: string }) => membership.status === 'active')
      .map((membership: { organization_id: string }) => membership.organization_id);
  } catch (error) {
    console.error(`Failed to get WorkOS organizations for user ${userId}:`, error);
    return [];
  }
}
```

### Step 2: Update Token Generation

In `src/api/app/email-signin.ts`:

```typescript
// Check if user is a member of Thepia Org
const thepiaMemberOrgId = org.provider === "workos" 
  ? org.settings.workos?.organizationId 
  : undefined;

let isThepiaMember = false;
if (thepiaMemberOrgId && enableThepiaMemberAdmin) {
  const userOrgIds = await getUserOrganizationIds(user.id, org.provider);
  isThepiaMember = userOrgIds.includes(thepiaMemberOrgId);
}
```

### Step 3: Handle Auth0 Organization IDs

For Auth0, we need to determine the Thepia Org ID. Options:

1. **Environment variable**: `AUTH0_THEPIA_ORG_ID`
2. **App configuration**: Add to `AppRouteConfig.settings.auth0`
3. **Query by name**: Look up org by name "Thepia"

**Recommended**: Add to app configuration:

```typescript
export interface AppRouteConfig {
  settings: {
    auth0?: {
      domain: string;
      clientId: string;
      managementClientId: string;
      managementClientSecret: string;
      audience?: string;
      thepiaMemberOrgId?: string;  // NEW: Thepia Org ID for membership check
    };
    workos?: {
      apiKey: string;
      clientId: string;
      organizationId?: string;
      environment?: string;
    };
  };
}
```

## Key Differences Summary

| Aspect | Auth0 | WorkOS |
|--------|-------|--------|
| **Membership Storage** | Separate API (not in user object) | Both single org + memberships API |
| **Multiple Orgs** | Yes, via API | Yes, via memberships API |
| **User Object Contains** | No org IDs | Primary org_id only |
| **API to Check** | `GET /users/{id}/organizations` | `GET /organization_memberships?user_id={id}` |
| **Membership Status** | N/A | `pending`, `active`, `inactive` |
| **Recommended Check** | Query user's organizations | Query active memberships |

## Performance Considerations

### Current Inefficient Approach (Auth0)
- Queries ALL organizations
- For each org, gets all members
- O(n*m) complexity where n=orgs, m=members per org

### Optimized Approach
- Query user's organizations directly
- O(1) complexity
- Single API call per user

### Caching Strategy

For high-traffic scenarios, consider caching:

```typescript
const orgMembershipCache = new Map<string, {
  orgIds: string[];
  expiresAt: number;
}>();

async function getUserOrganizationIds(
  userId: string,
  provider: 'auth0' | 'workos',
  cacheTTL: number = 300000 // 5 minutes
): Promise<string[]> {
  const cached = orgMembershipCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.orgIds;
  }

  const orgIds = await fetchUserOrganizations(userId, provider);
  orgMembershipCache.set(userId, {
    orgIds,
    expiresAt: Date.now() + cacheTTL
  });

  return orgIds;
}
```

## Next Steps

1. Create `src/api/utils/org-membership.ts` with helper functions
2. Update `AppRouteConfig` to include `thepiaMemberOrgId` for Auth0
3. Update `_handleVerifyEmail()` to use new helper functions
4. Add tests for both Auth0 and WorkOS membership detection
5. Consider caching strategy for production


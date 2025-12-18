# Organization Membership Detection - Summary

## Key Finding

**The current implementation is incorrect** because it assumes users can only belong to ONE organization:

```typescript
// ❌ WRONG - assumes single organization_id
const isThepiaMember = authResult.user.metadata?.organization_id === thepiaMemberOrgId;
```

**Reality**: Both Auth0 and WorkOS support users belonging to **multiple organizations**.

## Auth0 Reality

### How It Works
- User object does **NOT** contain organization IDs
- Organization memberships are stored **separately** in Auth0's system
- Must query Management API to get user's organizations

### Correct API Call
```typescript
// Get all organizations user belongs to
const organizations = await auth0Client.getUserOrganizations(userId);
const orgIds = organizations.map(org => org.id);
const isThepiaMember = orgIds.includes(thepiaMemberOrgId);
```

### Current Codebase Pattern
The codebase already has this pattern in `src/config/enhanced-domain-router.ts`:
```typescript
// Queries user's organizations (correct approach)
for (const org of this.getAllOrganizations()) {
  const members = await auth0Client.getOrganizationMembers(org.id);
  // ...
}
```

But this is **inefficient** - it queries all orgs instead of querying the user's orgs.

## WorkOS Reality

### How It Works
- User has a primary `organization_id` field (single org)
- Users can also have **multiple organization memberships** via API
- Organization Memberships API returns list of all memberships

### Correct API Call
```typescript
// Get all organization memberships for user
const response = await workosRequest(
  `/user_management/organization_memberships?user_id=${userId}`,
  { method: "GET" }
);

// Filter for active memberships
const orgIds = response.data
  .filter(m => m.status === 'active')
  .map(m => m.organization_id);

const isThepiaMember = orgIds.includes(thepiaMemberOrgId);
```

### Current Codebase Pattern
From `src/api/workos.ts` (lines 635-640):
```typescript
// ❌ Only captures primary organization
...(response.organization_id && { organization_id: response.organization_id }),
```

This misses users who are members of Thepia Org but have a different primary org.

## Implementation Requirements

### 1. Create Helper Function

Create `src/api/utils/org-membership.ts`:

```typescript
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
```

### 2. Update App Configuration

Add Thepia Org ID for Auth0 apps:

```typescript
export interface AppRouteConfig {
  settings: {
    auth0?: {
      // ... existing fields ...
      thepiaMemberOrgId?: string;  // NEW: Thepia Org ID
    };
  };
}
```

### 3. Update Token Generation

In `src/api/app/email-signin.ts`:

```typescript
// Get Thepia Org ID based on provider
const thepiaMemberOrgId = org.provider === "workos" 
  ? org.settings.workos?.organizationId 
  : org.settings.auth0?.thepiaMemberOrgId;

// Check membership
let isThepiaMember = false;
if (thepiaMemberOrgId && enableThepiaMemberAdmin) {
  const userOrgIds = await getUserOrganizationIds(user.id, org.provider);
  isThepiaMember = userOrgIds.includes(thepiaMemberOrgId);
}
```

## API Comparison

| Aspect | Auth0 | WorkOS |
|--------|-------|--------|
| **User Object Contains Org IDs** | ❌ No | ⚠️ Only primary |
| **Multiple Orgs Supported** | ✅ Yes | ✅ Yes |
| **API to Get User's Orgs** | `GET /users/{id}/organizations` | `GET /organization_memberships?user_id={id}` |
| **Returns** | List of org objects | List of membership objects |
| **Membership Status** | N/A | `pending`, `active`, `inactive` |

## Performance Impact

### Current Approach (Auth0)
- Queries **all organizations** in system
- For each org, gets **all members**
- Complexity: O(n*m) where n=orgs, m=members

### Optimized Approach
- Queries **user's organizations** directly
- Single API call
- Complexity: O(1)

## Files to Create/Modify

### Create
- `src/api/utils/org-membership.ts` - Helper functions for org membership detection

### Modify
- `src/api/config/apps.ts` - Add `thepiaMemberOrgId` to Auth0 settings
- `src/api/app/email-signin.ts` - Use new helper function
- `src/api/utils/auth-response-helpers.ts` - Already updated (no changes needed)

## Testing Scenarios

### Auth0
- User member of Thepia Org → `isThepiaMember: true`
- User NOT member of Thepia Org → `isThepiaMember: false`
- User member of multiple orgs including Thepia → `isThepiaMember: true`

### WorkOS
- User with Thepia Org as primary → `isThepiaMember: true`
- User with Thepia Org as secondary membership → `isThepiaMember: true`
- User with inactive Thepia membership → `isThepiaMember: false`
- User NOT member of Thepia Org → `isThepiaMember: false`

## Documentation References

- **Full Research**: `docs/ORG_MEMBERSHIP_DETECTION_RESEARCH.md`
- **Auth0 API**: https://auth0.com/docs/api/management/v2/users/get-user-organizations
- **WorkOS API**: https://workos.com/docs/authkit/users-organizations

## Next Steps

1. Review the research document for detailed implementation
2. Create `src/api/utils/org-membership.ts`
3. Update app configuration with Auth0 Thepia Org ID
4. Update token generation to use new helper
5. Add comprehensive tests
6. Consider caching for production performance


# Supabase Token Role Determination - Clean Implementation

## Problem Statement

The original `_handleVerifyEmail` function had unclear Supabase token generation logic, particularly around role determination. The role was being determined inline without clear visibility into the fallback logic.

## Solution: Clean Role Determination

### Role Determination Flow

```
User Data
    ↓
┌─────────────────────────────────────────┐
│ extractUserRole(metadata, email)        │
├─────────────────────────────────────────┤
│ 1. Check metadata.role                  │
│    ├─ If defined → Use it               │
│    └─ If not defined → Continue         │
│                                         │
│ 2. Check email domain                   │
│    ├─ If @thepia.com → "thepia_staff"   │
│    └─ If other → Continue               │
│                                         │
│ 3. Default fallback                     │
│    └─ Return "authenticated"            │
└─────────────────────────────────────────┘
    ↓
Role String
```

### Implementation

**File**: `src/api/utils/auth-response-helpers.ts`

```typescript
export function extractUserRole(
  metadata?: Record<string, unknown>,
  email?: string
): string {
  // 1. Check for explicit role in metadata
  if (metadata && typeof metadata === "object" && "role" in metadata) {
    const role = metadata.role;
    if (typeof role === "string") {
      return role;
    }
  }

  // 2. Determine role based on email domain
  if (email?.endsWith("@thepia.com")) {
    return "thepia_staff";
  }

  // 3. Default fallback
  return "authenticated";
}
```

### Usage in Token Generation

**File**: `src/api/app/email-signin.ts`

```typescript
async function generateSupabaseTokenForUser(
  user: ReturnType<typeof normalizeAuthResult>,
  organization: { code: string; name: string; provider: string },
  appCode: string,
): Promise<{ token: string; expiresAt: number } | undefined> {
  try {
    // Build token parameters - this centralizes role determination
    const tokenParams = buildSupabaseTokenParams(user, organization);

    // Log role determination for debugging
    const roleSource = user.metadata?.role 
      ? "metadata" 
      : user.email.endsWith("@thepia.com") 
        ? "email domain" 
        : "default";
    
    console.log(
      `🔍 [${appCode}] User role for ${user.email}: "${tokenParams.role}" (from ${roleSource})`
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

## Example Scenarios

### Scenario 1: User with Explicit Role

```typescript
const user = {
  id: "workos|user123",
  email: "admin@example.com",
  metadata: { role: "admin" }
};

// Role determination:
// 1. Check metadata.role → Found "admin"
// Result: role = "admin"

// Log output:
// 🔍 [demo] User role for admin@example.com: "admin" (from metadata)
```

### Scenario 2: Thepia Staff Member

```typescript
const user = {
  id: "workos|user456",
  email: "staff@thepia.com",
  metadata: {}
};

// Role determination:
// 1. Check metadata.role → Not found
// 2. Check email domain → Ends with @thepia.com
// Result: role = "thepia_staff"

// Log output:
// 🔍 [demo] User role for staff@thepia.com: "thepia_staff" (from email domain)
```

### Scenario 3: Regular User

```typescript
const user = {
  id: "workos|user789",
  email: "user@example.com",
  metadata: {}
};

// Role determination:
// 1. Check metadata.role → Not found
// 2. Check email domain → Not @thepia.com
// 3. Use default fallback
// Result: role = "authenticated"

// Log output:
// 🔍 [demo] User role for user@example.com: "authenticated" (from default)
```

### Scenario 4: Metadata Role Overrides Email Domain

```typescript
const user = {
  id: "workos|user999",
  email: "user@thepia.com",
  metadata: { role: "viewer" }
};

// Role determination:
// 1. Check metadata.role → Found "viewer"
// Result: role = "viewer" (metadata takes precedence)

// Log output:
// 🔍 [demo] User role for user@thepia.com: "viewer" (from metadata)
```

## Test Coverage

All role determination scenarios are covered by tests:

```
✅ should determine role from user metadata
✅ should determine thepia_staff role from email domain
✅ should default to authenticated role
✅ should prioritize metadata role over email domain
```

## Benefits

1. **Explicit Logic**: Role determination is clear and easy to follow
2. **Debuggable**: Logging shows exactly which rule was applied
3. **Maintainable**: Centralized in one function
4. **Testable**: All scenarios have test coverage
5. **Type-Safe**: Proper TypeScript types throughout
6. **Reusable**: Can be used in other auth handlers

## Integration with Supabase RLS

The determined role is included in the JWT claims and used by Supabase RLS policies:

```typescript
const claims: SupabaseTokenClaims = {
  id: user.id,
  email: user.email,
  app_code: organization.code,
  role: extractUserRole(user.metadata, user.email),  // ← Used for RLS
  // ... other claims
};
```

This allows Supabase to enforce row-level security based on the user's role.


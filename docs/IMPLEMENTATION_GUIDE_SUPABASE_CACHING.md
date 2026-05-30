# Implementation Guide: Supabase Client Caching

## Current Bottleneck

**File:** `src/api/utils/supabase-token-exchange.ts` (lines 42-65)

```typescript
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured...");
  }

  supabaseAdmin = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return supabaseAdmin;
}
```

**Status:** ✅ Already implements caching!

---

## Problem: Multiple Client Instances

The issue is NOT that clients aren't cached. The issue is that **multiple Supabase clients are created in different places**:

### 1. Token Exchange Client (Cached)
- **File:** `src/api/utils/supabase-token-exchange.ts`
- **Status:** ✅ Cached with `getSupabaseAdmin()`
- **Usage:** JWT token generation, user role lookup

### 2. Metadata Endpoint Client (NOT Cached)
- **File:** `src/api/app/metadata.ts`
- **Status:** ❌ Creates new client on every request
- **Usage:** GET/PATCH user metadata

### 3. Other Endpoints (Potentially NOT Cached)
- Various handlers may create clients independently
- No centralized client management

---

## Solution: Centralized Client Cache

### Step 1: Create Client Cache Module

**File:** `src/api/utils/supabase-client-cache.ts` (NEW)

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Global client cache
const clientCache = new Map<string, ReturnType<typeof createClient>>();

/**
 * Get or create a cached Supabase client
 * @param cacheKey - Unique key for this client (e.g., "admin", "user", "metadata")
 * @param options - Client creation options
 */
export function getCachedSupabaseClient(
  cacheKey: string,
  options?: {
    useServiceRole?: boolean;
    schema?: string;
  }
) {
  // Return cached client if available
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url) {
    throw new Error("SUPABASE_URL must be configured");
  }

  const key = options?.useServiceRole ? serviceRoleKey : anonKey;
  if (!key) {
    throw new Error(
      `${options?.useServiceRole ? "SUPABASE_SERVICE_ROLE_KEY" : "SUPABASE_ANON_KEY"} must be configured`
    );
  }

  // Create new client
  const client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: options?.schema || "api",
    },
    global: {
      headers: {
        "Access-Control-Max-Age": "86400", // Cache CORS preflight for 24 hours
      },
    },
  });

  // Cache it
  clientCache.set(cacheKey, client);
  return client;
}

/**
 * Get the admin (service role) client
 */
export function getSupabaseAdmin() {
  return getCachedSupabaseClient("admin", { useServiceRole: true });
}

/**
 * Get the user (anon key) client
 */
export function getSupabaseUser() {
  return getCachedSupabaseClient("user", { useServiceRole: false });
}

/**
 * Clear all cached clients (for testing)
 */
export function clearClientCache() {
  clientCache.clear();
}
```

### Step 2: Update Token Exchange

**File:** `src/api/utils/supabase-token-exchange.ts`

Replace the existing client caching with:

```typescript
import { getSupabaseAdmin } from "./supabase-client-cache.ts";

// Remove the old caching code:
// let supabaseAdmin: ReturnType<typeof createClient> | null = null;
// function getSupabaseAdmin() { ... }

// Now just use the centralized cache:
const supabaseAdmin = getSupabaseAdmin();
```

### Step 3: Update Metadata Endpoint

**File:** `src/api/app/metadata.ts`

```typescript
import { getSupabaseAdmin } from "../utils/supabase-client-cache.ts";

async function handleGetMetadata(request: Request): Promise<Response> {
  try {
    // Use cached client instead of creating new one
    const supabase = getSupabaseAdmin();
    
    // ... rest of implementation
  }
}
```

### Step 4: Audit All Client Creation

Search for all `createClient` calls:

```bash
grep -r "createClient" src/api/ --include="*.ts"
```

Update each to use the cache:

```typescript
// Before:
const client = createClient(url, key, { ... });

// After:
const client = getSupabaseAdmin(); // or getSupabaseUser()
```

---

## Expected Performance Impact

### Current State
```
Request 1: Create client (~80ms) + Query (~100ms) = 180ms
Request 2: Create client (~80ms) + Query (~100ms) = 180ms
Request 3: Create client (~80ms) + Query (~100ms) = 180ms
```

### After Caching
```
Request 1: Create client (~80ms) + Query (~100ms) = 180ms
Request 2: Use cached client (<1ms) + Query (~100ms) = 101ms
Request 3: Use cached client (<1ms) + Query (~100ms) = 101ms
```

**Savings:** ~80ms per request (after first request)

---

## Implementation Checklist

- [ ] Create `src/api/utils/supabase-client-cache.ts`
- [ ] Update `src/api/utils/supabase-token-exchange.ts`
- [ ] Update `src/api/app/metadata.ts`
- [ ] Search for all `createClient` calls
- [ ] Update each to use cache
- [ ] Test all endpoints
- [ ] Verify cache behavior
- [ ] Deploy to staging
- [ ] Monitor performance

---

## Testing

### Unit Test

```typescript
import { getCachedSupabaseClient, clearClientCache } from "./supabase-client-cache.ts";

Deno.test("Supabase client caching", async () => {
  clearClientCache();
  
  const client1 = getCachedSupabaseClient("test");
  const client2 = getCachedSupabaseClient("test");
  
  // Should be the same instance
  assertEquals(client1, client2);
  
  clearClientCache();
});
```

### Integration Test

```typescript
// Measure request latency before and after
const before = performance.now();
await handleMetadataRequest(request);
const after = performance.now();

console.log(`Request latency: ${after - before}ms`);
```

---

## Rollback Plan

If issues occur:

1. Revert `supabase-client-cache.ts` creation
2. Revert changes to token exchange
3. Revert changes to metadata endpoint
4. Redeploy

---

## Next Steps

After implementing Supabase client caching:

1. **Lazy Initialize Providers** (40ms savings)
   - Only create Auth0/WorkOS clients when needed
   - File: `src/api/router/shared-router.ts`

2. **Optimize Database Queries** (100-200ms savings)
   - Cache user role lookups
   - Cache metadata with TTL

3. **Defer Non-Critical Initialization** (50-80ms savings)
   - Lazy load non-critical modules
   - Defer initialization until needed

---

## Conclusion

Supabase client caching is already partially implemented but not consistently applied across all endpoints. Centralizing the cache will ensure all endpoints benefit from client reuse, saving ~80ms per request after the first request.

**Effort:** 1-2 hours
**Savings:** ~80ms per request (16% of startup)
**Risk:** Low


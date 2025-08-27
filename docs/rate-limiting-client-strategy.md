# flows-auth Rate Limiting Strategy

## Current State vs. Recommended Approach

### ❌ Current Problem
The flows-auth library currently implements Auth0-specific rate limiting that duplicates server-side rate limiting, leading to:
- Redundant logic and maintenance overhead  
- Client-side delays that are unnecessary with proper server handling
- Inconsistent behavior between different API servers

### ✅ Recommended Solution
Transform client-side rate limiting into **intelligent server signal handling**:
- Respect server rate limit headers (429 responses, Retry-After headers)
- Implement smart backoff based on actual server responses
- Remove Auth0-specific rate limiting (now handled server-side)
- Keep general-purpose rate limiting for other APIs

## Implementation Plan

### Phase 1: Remove Redundant Auth0 Rate Limiting

**Current Auth0-specific logic to remove:**
```typescript
// ❌ Remove this - now handled server-side
private readonly TOKEN_BUCKET_SIZE = 10;
private readonly TOKEN_REFILL_INTERVAL = 1000; 
private readonly TOKEN_REFILL_RATE = 10;
```

**Files to update:**
- `/src/utils/rate-limiter.ts` - Remove Auth0 token bucket logic
- `/src/api/auth-api.ts` - Remove rate limiting configuration
- `/tests/unit/rate-limiter.test.ts` - Update tests

### Phase 2: Implement Intelligent Client Response Handler

**New approach:**
```typescript
export class SmartApiClient {
  private backoffState = new Map<string, {
    retryAfter: number;
    attempts: number;
    lastAttempt: number;
  }>();

  async request(url: string, options: RequestInit): Promise<Response> {
    const endpoint = new URL(url).pathname;
    
    // Check if we should wait based on previous rate limits
    const backoff = this.backoffState.get(endpoint);
    if (backoff && Date.now() < backoff.retryAfter) {
      const waitTime = backoff.retryAfter - Date.now();
      console.log(`⏳ Waiting ${waitTime}ms due to server rate limit on ${endpoint}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    const response = await fetch(url, options);
    
    // Learn from server responses
    this.handleRateLimitResponse(endpoint, response);
    
    return response;
  }

  private handleRateLimitResponse(endpoint: string, response: Response): void {
    if (response.status === 429) {
      // Server told us we're rate limited
      const retryAfter = response.headers.get('Retry-After');
      const rateLimitReset = response.headers.get('X-RateLimit-Reset');
      
      let waitTime = 1000; // Default 1 second
      
      if (retryAfter) {
        waitTime = parseInt(retryAfter) * 1000;
      } else if (rateLimitReset) {
        waitTime = (parseInt(rateLimitReset) * 1000) - Date.now();
      }
      
      this.backoffState.set(endpoint, {
        retryAfter: Date.now() + waitTime,
        attempts: (this.backoffState.get(endpoint)?.attempts || 0) + 1,
        lastAttempt: Date.now()
      });
      
      console.log(`🚫 Rate limited by server on ${endpoint}, backing off for ${waitTime}ms`);
    } else if (response.ok) {
      // Success - clear any backoff state
      this.backoffState.delete(endpoint);
    }
  }
}
```

### Phase 3: Keep General-Purpose Rate Limiting

**For non-API-server endpoints (direct third-party APIs):**
```typescript
export class GeneralRateLimiter {
  private requestTimes = new Map<string, number[]>();
  
  shouldThrottle(endpoint: string, maxRequestsPerSecond: number = 5): boolean {
    const now = Date.now();
    const windowStart = now - 1000; // 1 second window
    
    let requests = this.requestTimes.get(endpoint) || [];
    
    // Clean old requests
    requests = requests.filter(time => time > windowStart);
    
    if (requests.length >= maxRequestsPerSecond) {
      console.log(`⚠️ Client-side rate limiting ${endpoint}: ${requests.length}/${maxRequestsPerSecond} requests in last second`);
      return true;
    }
    
    requests.push(now);
    this.requestTimes.set(endpoint, requests);
    return false;
  }
}
```

## Configuration Strategy

### Server-Aware Configuration

```typescript
export interface RateLimitConfig {
  // Server endpoints - rely on server rate limiting
  serverEndpoints: {
    respectServerHeaders: true;
    defaultBackoff: number; // Fallback if no Retry-After header
    maxBackoff: number;     // Cap on backoff time
  };
  
  // Direct API calls - client-side rate limiting
  directEndpoints: {
    [endpoint: string]: {
      requestsPerSecond: number;
      burstCapacity?: number;
    };
  };
}

const DEFAULT_RATE_CONFIG: RateLimitConfig = {
  serverEndpoints: {
    respectServerHeaders: true,
    defaultBackoff: 1000,      // 1 second default
    maxBackoff: 30000,         // 30 second max
  },
  directEndpoints: {
    // Only for direct third-party API calls
    '/external-api/*': {
      requestsPerSecond: 5,
      burstCapacity: 10,
    }
  }
};
```

## Migration Strategy

### Step 1: Update AuthApiClient

**Current:**
```typescript
// ❌ Remove this complex rate limiting logic
async rateLimitedRequest<T>(...) {
  return globalRateLimiter.executeWithRetry(...)
}
```

**New:**
```typescript
// ✅ Simple server-aware requests  
async request<T>(endpoint: string, options: RequestInit): Promise<T> {
  const response = await this.smartClient.request(
    `${this.baseUrl}${endpoint}`, 
    options
  );
  
  if (!response.ok) {
    const error = await this.handleErrorResponse(response);
    throw error;
  }
  
  return response.json();
}
```

### Step 2: Update Configuration

**Remove from AuthConfig:**
```typescript
// ❌ Remove this - no longer needed
rateLimiting?: RateLimitingConfig;
```

**Add smart client configuration:**
```typescript
// ✅ Add this for intelligent handling
smartClient?: {
  respectServerHeaders: boolean;
  maxBackoffTime: number;
  debugLogging: boolean;
};
```

### Step 3: Update Tests

**Remove Auth0-specific rate limit tests:**
- Remove token bucket tests
- Remove Auth0 parameter validation tests
- Keep general rate limiting utility tests

**Add server response handling tests:**
```typescript
describe('Smart API Client', () => {
  it('should respect Retry-After headers', async () => {
    const mockResponse = new Response('Rate limited', {
      status: 429,
      headers: { 'Retry-After': '5' }
    });
    
    // Test that client waits 5 seconds on next request
  });
  
  it('should clear backoff on successful requests', async () => {
    // Test that successful requests reset rate limit state
  });
});
```

## Benefits of This Approach

### ✅ Advantages

1. **Eliminates Redundancy**: No duplicate rate limiting logic
2. **Server-Driven**: Rate limits controlled by server configuration
3. **Adaptive**: Learns from actual server behavior
4. **Efficient**: No unnecessary client-side delays
5. **Maintainable**: Simpler client logic focused on server communication

### 📊 Performance Impact

- **Before**: 3-second delays between ALL Auth0-related requests
- **After**: Burst traffic allowed, intelligent backoff only when server indicates

### 🔧 Maintenance Impact

- **Reduced Code**: ~200 lines less Auth0-specific rate limiting code
- **Centralized Logic**: Rate limits managed server-side
- **Better Testability**: Server behavior drives client behavior

## Implementation Timeline

### Week 1: Analysis and Planning
- ✅ Document current rate limiting usage
- ✅ Identify redundant code paths
- ✅ Design smart client interface

### Week 2: Core Implementation  
- 🔄 Implement SmartApiClient
- 🔄 Update AuthApiClient to use smart client
- 🔄 Remove redundant rate limiting code

### Week 3: Testing and Validation
- 📋 Update unit tests
- 📋 Test against local API server
- 📋 Validate rate limit header handling

### Week 4: Integration and Deployment
- 📋 Integration testing with thepia.com API
- 📋 Performance validation
- 📋 Documentation updates

## Monitoring and Validation

### Success Metrics
- Reduced client-side delays (measure request timing)
- Proper handling of server rate limit responses
- No increase in 429 error rates
- Improved user experience (faster auth flows)

### Debug Logging
```typescript
// Smart client should log rate limiting decisions
console.log('🎯 Server rate limit respected:', {
  endpoint,
  retryAfter: '5s',
  reason: 'Retry-After header'
});
```

This approach transforms flows-auth from implementing its own rate limiting to intelligently cooperating with server-side rate limiting, resulting in better performance and simpler maintenance.
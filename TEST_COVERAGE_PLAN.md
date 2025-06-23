# flows-auth Test Coverage Plan

## ⚠️ Critical Integration Issues Identified

Based on the development experience, these integration failures need comprehensive test coverage:

### 1. **SSR vs Client-Only Import Issues**
- **Problem**: Vite static analysis tries to resolve dynamic imports even in `onMount()`
- **Impact**: Library cannot be imported in SvelteKit apps
- **Test Need**: Integration tests with SvelteKit, Astro, and other SSR frameworks

### 2. **Package Export Configuration**
- **Problem**: Package.json exports don't match actual build output paths
- **Impact**: Import errors like `Cannot find module '@thepia/flows-auth'`
- **Test Need**: Package resolution tests across different module systems

### 3. **Component Instantiation in Svelte**
- **Problem**: SignInForm component fails to render or mount properly
- **Impact**: Auth UI doesn't appear or functions incorrectly
- **Test Need**: Component rendering tests in real Svelte environments

### 4. **WebAuthn Conditional Mediation**
- **Problem**: Passkey autosuggest not appearing despite correct implementation
- **Impact**: Poor UX, users don't know passkeys are available
- **Test Need**: End-to-end WebAuthn tests with real browser automation

## 📋 Comprehensive Test Strategy

### Phase 1: Unit & Component Tests (Foundation)

#### 1.1 Core Library Functions
```typescript
// /tests/unit/auth-store.test.ts
describe('AuthStore', () => {
  test('createAuthStore with valid config')
  test('conditional authentication flow')
  test('passkey registration flow')
  test('passkey authentication flow')
  test('error handling and reporting')
  test('state transitions')
})

// /tests/unit/webauthn-utils.test.ts
describe('WebAuthn Utils', () => {
  test('isWebAuthnSupported detection')
  test('conditional mediation support check')
  test('platform authenticator availability')
  test('credential encoding/decoding')
})

// /tests/unit/config.test.ts
describe('Configuration', () => {
  test('createDefaultConfig validation')
  test('environment variable handling')
  test('branding configuration')
  test('error reporting configuration')
})
```

#### 1.2 Svelte Components
```typescript
// /tests/components/SignInForm.test.ts
describe('SignInForm Component', () => {
  test('renders with valid config')
  test('email input triggers conditional auth')
  test('WebAuthn button appears when supported')
  test('error states display correctly')
  test('success events fire properly')
  test('loading states work correctly')
})
```

### Phase 2: Integration Tests (Critical)

#### 2.1 Package Distribution Tests
```typescript
// /tests/integration/package-exports.test.ts
describe('Package Exports', () => {
  test('ESM import works in Node.js')
  test('CommonJS require works in Node.js')
  test('TypeScript types resolve correctly')
  test('Svelte component import works')
  test('Build outputs match export paths')
})

// /tests/integration/framework-compatibility.test.ts
describe('Framework Compatibility', () => {
  test('SvelteKit SSR + client hydration')
  test('SvelteKit static site generation')
  test('Vite + Svelte standalone')
  test('Astro with Svelte integration')
  test('Webpack + Svelte setup')
})
```

#### 2.2 Browser WebAuthn Tests (Limited Support)
```typescript
// /tests/e2e/webauthn-chromium.test.ts - CHROMIUM ONLY
describe('WebAuthn Integration - Chromium Virtual Authenticator', () => {
  test('conditional mediation triggers autosuggest', async ({ page, context }) => {
    // ⚠️ Only works in Chromium browsers (Chrome, Edge)
    const client = await context.newCDPSession(page);
    await client.send('WebAuthn.enable');
    // Full virtual authenticator setup...
  })
  test('passkey registration complete flow')
  test('passkey authentication complete flow')
  test('error handling with virtual WebAuthn API')
})

// /tests/e2e/webauthn-webkit.test.ts - MOCK-BASED
describe('WebAuthn API Calls - WebKit/Safari', () => {
  test('conditional mediation API called correctly', async ({ page }) => {
    // ⚠️ Safari - WebAuthn virtual authenticator NOT supported
    await page.addInitScript(() => {
      // Mock navigator.credentials API for testing
      Object.defineProperty(navigator, 'credentials', {
        value: { get: async () => ({ id: 'mock' }) }
      });
    });
  })
})
```

#### 2.3 Demo App Integration
```typescript
// /tests/integration/demo-app.test.ts
describe('flows-app-demo Integration', () => {
  test('library loads successfully')
  test('components render without errors')
  test('authentication flow works end-to-end')
  test('error reporting functions properly')
  test('state management works correctly')
})
```

### Phase 3: System Tests (Production Readiness)

#### 3.1 Production Environment Tests
```typescript
// /tests/system/production-build.test.ts
describe('Production Build', () => {
  test('minified bundle works correctly')
  test('tree shaking removes unused code')
  test('TypeScript declaration files are correct')
  test('Source maps are generated')
  test('Bundle size is within limits')
})

// /tests/system/browser-compatibility.test.ts
describe('Browser Compatibility', () => {
  test('Chrome latest')
  test('Safari latest')
  test('Firefox latest')
  test('Edge latest')
  test('iOS Safari')
  test('Android Chrome')
})
```

#### 3.2 Performance & Security Tests
```typescript
// /tests/system/performance.test.ts
describe('Performance', () => {
  test('library loading time')
  test('component rendering performance')
  test('WebAuthn response times')
  test('memory usage')
  test('bundle size impact')
})

// /tests/system/security.test.ts
describe('Security', () => {
  test('no sensitive data in logs')
  test('proper credential handling')
  test('CSP compatibility')
  test('XSS protection')
})
```

## 🔧 Test Infrastructure Setup

### Testing Tools
```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@testing-library/svelte": "^4.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "vitest": "^1.0.0",
    "jsdom": "^23.0.0",
    "happy-dom": "^12.0.0"
  }
}
```

**⚠️ Important WebAuthn Testing Limitations:**
- **Chromium only**: Virtual authenticator support via CDP (Chrome, Edge)
- **WebKit/Safari**: No virtual authenticator - requires mocking
- **Firefox**: No virtual authenticator - requires mocking

### Mock WebAuthn Implementation
```typescript
// /tests/mocks/webauthn-mock.ts
export class WebAuthnMock {
  static setup() {
    global.navigator.credentials = {
      get: vi.fn(),
      create: vi.fn()
    }
    global.PublicKeyCredential = MockPublicKeyCredential
  }
  
  static simulateConditionalUI() {
    // Mock conditional mediation behavior
  }
  
  static simulatePasskeySelection() {
    // Mock passkey selection from autosuggest
  }
}
```

### Playwright Configuration (Multi-Browser Strategy)
```typescript
// /playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'chromium-webauthn-full',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-webauthn-testing-api']
        }
      },
      testMatch: '**/webauthn.chromium.test.ts'
    },
    {
      name: 'webkit-webauthn-mock',
      use: { ...devices['Desktop Safari'] },
      testMatch: '**/webauthn.webkit.test.ts'
    },
    {
      name: 'firefox-webauthn-mock', 
      use: { ...devices['Desktop Firefox'] },
      testMatch: '**/webauthn.firefox.test.ts'
    }
  ]
});
```

### Vitest Configuration
```typescript
// /vitest.config.ts
export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      threshold: {
        global: {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90
        }
      }
    }
  }
})
```

## 🎯 Priority Testing Areas

### High Priority (Critical Integration Issues)
1. **Package Import Resolution** - Prevents library from being used
2. **SvelteKit SSR Compatibility** - Blocks adoption in SvelteKit apps
3. **WebAuthn Conditional UI** - Core feature not working reliably
4. **Component Rendering** - UI components fail to instantiate

### Medium Priority (Stability & Quality)
1. **Error Handling & Reporting** - Needs comprehensive coverage
2. **State Management** - Auth flow state transitions
3. **Configuration Validation** - Prevent misconfiguration issues
4. **Cross-Browser Testing** - Ensure wide compatibility

### Low Priority (Enhancement & Optimization)
1. **Performance Testing** - Bundle size and speed
2. **Security Testing** - Additional security validations
3. **Accessibility Testing** - WCAG compliance
4. **Documentation Testing** - Example code validation

## 📊 Test Coverage Metrics

### Target Coverage Goals
- **Unit Tests**: 95% code coverage
- **Integration Tests**: 100% of public API surface
- **E2E Tests**: 100% of user-facing flows (Chromium full, others mocked)
- **Browser Support**: 
  - **Chromium**: Full WebAuthn virtual authenticator testing
  - **Safari/Firefox**: API mocking + manual testing required

### Continuous Integration
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run unit tests
        run: pnpm test:unit
        
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run integration tests
        run: pnpm test:integration
        
  e2e-chromium-webauthn:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: microsoft/playwright-github-action@v1
      - name: Run Chromium WebAuthn E2E tests
        run: pnpm test:e2e:chromium
        
  e2e-webkit-mock:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: microsoft/playwright-github-action@v1
      - name: Run WebKit mocked WebAuthn tests
        run: pnpm test:e2e:webkit
```

## 🚀 Implementation Roadmap

### Week 1: Foundation
- Set up testing infrastructure (Vitest, Playwright, mocks)
- Implement unit tests for core functions
- Set up CI/CD pipeline

### Week 2: Integration
- Package export resolution tests
- SvelteKit integration tests
- Framework compatibility matrix

### Week 3: WebAuthn & E2E
- Real browser WebAuthn tests
- Conditional mediation automation
- Cross-browser validation

### Week 4: Production Readiness
- Performance benchmarks
- Security validation
- Documentation and examples

## 📝 Test Scenarios by Risk Level

### Critical Risk (Breaks Integration)
- ❌ Package cannot be imported in SvelteKit
- ❌ Components fail to render in Svelte
- ❌ Dynamic imports blocked by Vite
- ❌ WebAuthn conditional UI not working

### High Risk (Poor UX)
- ⚠️ Passkey autosuggest doesn't appear
- ⚠️ Error states not handled properly
- ⚠️ Loading states confusing
- ⚠️ Cross-browser inconsistencies

### Medium Risk (Configuration Issues)
- 🔧 Invalid config not caught
- 🔧 Missing environment variables
- 🔧 HTTPS requirements unclear
- 🔧 RP ID configuration problems

### Low Risk (Edge Cases)
- 💡 Rare WebAuthn error codes
- 💡 Unusual browser behaviors
- 💡 Network failure scenarios
- 💡 Performance under load

## 🔍 Testing Priorities Based on Current Issues

1. **Package Resolution** (Critical) - Library unusable without this
2. **WebAuthn Conditional UI** (Critical) - Core feature not working
3. **SvelteKit Integration** (High) - Blocks primary use case
4. **Component Instantiation** (High) - UI doesn't work properly
5. **Error Handling** (Medium) - Poor debugging experience
6. **Configuration Validation** (Medium) - Setup difficulties

This comprehensive test plan addresses the integration issues you've experienced and provides a systematic approach to ensuring flows-auth works reliably across all intended environments and use cases.
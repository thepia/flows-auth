# Regression Tests

This directory contains regression tests that guard against specific bugs we've fixed in the flows-auth library. These tests are designed to be **safe to run** and will catch regressions without breaking existing functionality.

## 🎯 Purpose

These tests implement the **5-step error analysis framework**:

1. **📱 User Experience** - Ensure users never see technical errors
2. **📊 Logging** - Verify proper error categorization and reporting  
3. **🛡️ Prevention** - Test architectural patterns that prevent issues
4. **🧪 Testing** - Automated regression detection
5. **📝 Documentation** - Verify fixes are properly documented

## 📁 Test Files

### `error-handling.test.ts`
**Guards against**: Technical error exposure and incorrect user flows

- ✅ **Technical Error Exposure**: Users should never see `"Endpoint /auth/signin/magic-link not found"`
- ✅ **Automatic Registration Flow**: Unregistered users should auto-transition to registration
- ✅ **Correct API Architecture**: Components should use `authStore.checkUser()` not direct API calls
- ✅ **Component Compilation**: Components should render without undefined property errors

### `development-environment.test.ts`  
**Guards against**: Build configuration and development environment issues

- ✅ **Package.json Exports**: Simplified exports structure that works with Svelte
- ✅ **Vite Configuration**: Proper library build settings and external dependencies
- ✅ **Build Artifacts**: Correct output files and TypeScript definitions
- ✅ **Documentation**: Force reinstall workflow and troubleshooting guides

### `integration-safety.test.ts`
**Guards against**: End-to-end flow regressions without external dependencies

- ✅ **Complete User Flows**: Full sign-in/registration flows with mocked APIs
- ✅ **Error Handling Integration**: Error messages in real component context
- ✅ **Architecture Compliance**: Proper auth store usage in integration
- ✅ **Import Safety**: Library exports work correctly in test environment

## 🚀 Running the Tests

```bash
# Run all regression tests
pnpm test tests/regression/

# Run specific test file
pnpm test tests/regression/error-handling.test.ts

# Watch mode for development
pnpm test:watch tests/regression/
```

## 🛡️ Safety Guarantees

These tests are designed to be **completely safe**:

- ✅ **No real API calls** - All external requests are mocked
- ✅ **No side effects** - Tests clean up after themselves
- ✅ **No external dependencies** - Tests run in isolation
- ✅ **No production impact** - Tests only verify library behavior

## 🔍 What Each Test Catches

### Technical Error Exposure
```typescript
// ❌ BAD: Technical error shown to user
"Endpoint /auth/signin/magic-link not found"

// ✅ GOOD: User-friendly message or auto-transition
"Terms of Service" // (registration flow)
```

### Incorrect API Architecture  
```typescript
// ❌ BAD: Component calls API directly
const emailCheck = await authStore.api.checkEmail(email);

// ✅ GOOD: Component uses auth store method
const userCheck = await authStore.checkUser(email);
```

### Build Configuration Issues
```typescript
// ❌ BAD: Complex exports that break Svelte
"exports": {
  "./components/*": "./dist/components/*"
}

// ✅ GOOD: Simplified exports structure
"exports": {
  ".": { "svelte": "./dist/index.js" }
}
```

## 📊 Test Coverage

These regression tests cover the specific bugs we fixed:

| Bug Category | Test Coverage | Files Protected |
|--------------|---------------|-----------------|
| Error Handling | 8 test cases | `SignInForm.svelte` |
| API Architecture | 4 test cases | `auth-store.ts`, components |
| Build Config | 6 test cases | `package.json`, `vite.config.ts` |
| Development Environment | 5 test cases | Demo apps, documentation |

## 🔄 Adding New Regression Tests

When fixing new bugs, follow this pattern:

1. **Identify the specific bug** that was fixed
2. **Create a test case** that would fail with the old code
3. **Verify the test passes** with the fixed code
4. **Document the bug** and fix in the test description

```typescript
describe('Bug Fix: [Specific Issue]', () => {
  it('should [expected behavior] instead of [old broken behavior]', async () => {
    // Arrange: Set up conditions that triggered the bug
    
    // Act: Perform the action that used to fail
    
    // Assert: Verify the fix works
    expect(/* old broken behavior */).toBeNull();
    expect(/* new correct behavior */).toBeTruthy();
  });
});
```

## 🎯 Success Criteria

These tests are successful if they:

- ✅ **Catch regressions** when old bugs are reintroduced
- ✅ **Pass consistently** in CI/CD environments  
- ✅ **Run quickly** (< 30 seconds total)
- ✅ **Require no setup** beyond `pnpm install`
- ✅ **Document the fixes** clearly for future developers

## 📚 Related Documentation

- [`docs/DEVELOPMENT_ENVIRONMENT_FIXES.md`](../../docs/DEVELOPMENT_ENVIRONMENT_FIXES.md) - Complete troubleshooting guide
- [`docs/auth/comprehensive-implementation-plan.md`](../../docs/auth/comprehensive-implementation-plan.md) - Architecture requirements
- [Error Handling Methodology](../../docs/DEVELOPMENT_ENVIRONMENT_FIXES.md#-error-handling-methodology) - 5-step analysis framework

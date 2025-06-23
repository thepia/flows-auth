# Flows-Auth Test Suite

This directory contains comprehensive test coverage for the `@thepia/flows-auth` library.

## Running Tests

### Unit Tests (No API Required)
```bash
# Run all unit tests
pnpm test:unit

# Run with watch mode
pnpm test:watch
```

### Integration Tests (Requires API)

Integration tests require a running API server. You can test against either:
- **Local API** (default): https://localhost:8443
- **Public API**: https://api.thepia.com

```bash
# Test against local API (default)
pnpm test:integration

# Test against public API
TEST_API_ENV=public pnpm test:integration

# Test against custom API URL
TEST_API_URL=https://custom.api.com pnpm test:integration

# Test environment validation only
pnpm test:integration:env
```

### Running the Local API Server

Before running integration tests locally:

```bash
# From the main project directory
pnpm dev:local

# This starts the local API server on https://localhost:8443
```

## Test Configuration

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `TEST_API_ENV` | Environment to test against (`local` or `public`) | `local` |
| `TEST_API_URL` | Override API URL completely | Based on TEST_API_ENV |
| `TEST_AUTH_EMAIL` | Email of test user with passkey | `test-with-passkey@thepia.net` |
| `AUTH0_DOMAIN` | Auth0 tenant domain | `thepia.eu.auth0.com` |
| `AUTH0_CLIENT_ID` | Auth0 client ID | `test-flows-auth-client` |

### Test Accounts

Integration tests expect these test accounts to exist in Auth0:

1. **User with Passkey**: `test-with-passkey@thepia.net`
   - Has registered WebAuthn credentials
   - Used for passkey authentication tests

2. **User without Passkey**: `test-without-passkey@thepia.net`
   - No WebAuthn credentials
   - Used for magic link and registration tests

## Test Categories

### Unit Tests
- State machine logic (`/tests/stores/auth-state-machine.test.ts`)
- Store functionality (`/tests/stores/auth-store.test.ts`)
- Utility functions (`/tests/utils/`)
- API client methods (`/tests/api/`)

### Integration Tests
- Environment validation (`/tests/integration/api-environment.test.ts`)
- Full auth flows (`/tests/integration/auth-store-integration.test.ts`)
- WebAuthn scenarios
- Magic link flows
- Session management

## Debugging Tests

```bash
# Run tests with UI
pnpm test:ui

# Run specific test file
pnpm test tests/stores/auth-state-machine.test.ts

# Run tests with coverage
pnpm test:coverage
```

## Common Issues

### Integration Tests Failing

1. **API Not Available**
   ```
   ❌ API Environment NOT READY
   ```
   - Make sure local API is running: `pnpm dev:local`
   - Or switch to public API: `TEST_API_ENV=public pnpm test:integration`

2. **Test Accounts Missing**
   ```
   ⚠️ Test account not found: test-with-passkey@thepia.net
   ```
   - Ensure test accounts exist in Auth0
   - Update account emails in `test-setup.ts` if using different accounts

3. **CORS Issues**
   - Local API must be configured to accept requests from test environment
   - Check CORS headers in API response

## Writing New Tests

See [TESTING_PRINCIPLES.md](./TESTING_PRINCIPLES.md) for detailed guidelines on:
- Test patterns and best practices
- WebAuthn testing strategies
- Error classification
- Performance testing
- Memory leak detection
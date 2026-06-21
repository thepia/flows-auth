# WebAuthn Test Strategy - Quick Reference

## Quick Start

```bash
# Run automated test suite
pnpm test:website:webauthn

# Or run directly
./scripts/test-webauthn.sh
```

## Test Flow Overview

### 1. Automated Checks (30 seconds)

- ✅ Server accessibility
- ✅ HTTPS configuration
- ✅ API endpoint functionality
- ✅ Performance benchmarks
- ✅ Keychain directory verification

### 2. Manual Testing (5 minutes)

- 🔐 Registration flow with Touch ID/Face ID
- 🔑 Authentication flow verification
- 👥 Multiple user scenarios
- ❌ Error handling validation

## Core Test Scenarios

| Scenario           | Expected Result                                       | Time |
| ------------------ | ----------------------------------------------------- | ---- |
| **Registration**   | Touch ID prompt → Success message → Credential stored | 30s  |
| **Authentication** | Touch ID prompt → Success message                     | 15s  |
| **Multiple Users** | Each user gets unique passkey                         | 2min |
| **Error Handling** | Clear error messages, no crashes                      | 1min |

## Success Criteria

### ✅ Registration Success

- Touch ID/Face ID prompt appears
- Success message with credential ID
- Passkey appears in stored credentials list
- No JavaScript errors in console

### ✅ Authentication Success

- Touch ID/Face ID prompt appears
- "Authentication successful!" message
- Server logs show verification success
- Response time under 2 seconds

### ✅ System Health

- API response times < 500ms
- No memory leaks in challenge store
- Proper error handling for edge cases
- Keychain storage verification

## Quick Debug Commands

```bash
# Check server status
curl -k https://dev.thepia.com:4321/test-webauthn-config

# Monitor WebAuthn logs
npm run dev | grep -E "(WebAuthn|Challenge)"

# Check keychain entries
./scripts/check-webauthn-keychain.sh

# Verify client-server separation
./scripts/check-client-server-separation.sh
```

## Test Data

```javascript
// Standard test users
const testUsers = [
  { email: "test@thepia.com", userId: "test-user-123" },
  { email: "demo@thepia.com", userId: "demo-user-456" },
  { email: "admin@thepia.com", userId: "admin-user-789" },
];
```

## Common Issues & Solutions

| Issue                | Solution                                     |
| -------------------- | -------------------------------------------- |
| No Touch ID prompt   | Check HTTPS, verify platform authenticator   |
| "Invalid RP ID"      | Ensure domain matches certificate            |
| Registration fails   | Check challenge store, verify API parameters |
| Authentication fails | Verify passkey exists, check server logs     |

## Test Pages

- **Main Test**: `/test-webauthn-keychain` - Full registration/auth flow
- **Config Check**: `/test-webauthn-config` - Verify WebAuthn setup

## Reporting

The test script automatically generates a timestamped report:

- `webauthn-test-report-YYYYMMDD-HHMMSS.md`

## Integration with CI/CD

```yaml
# Add to GitHub Actions
- name: Test WebAuthn
  run: pnpm test:website:webauthn
```

## Mock Requirements

### WebAuthn Configuration Mock

```typescript
// Example mock implementation
vi.mock('../../src/api/utils/webauthn-config.ts', () => ({
  getRpIdFromRequest: (request: Request) => {
    const url = new URL(request.url);
    // Development environment
    if (url.hostname === 'dev.thepia.com' || url.hostname === 'api.dev.thepia.com') {
      return 'dev.thepia.com';
    }
    // Production environment
    if (url.hostname === 'thepia.com' || url.hostname === 'api.thepia.com') {
      return 'thepia.com';
    }
    // Default for tests
    return 'dev.thepia.com';
  }
}));
```

### Mock Expectations

1. **RP ID Handling**:
   - Must return 'dev.thepia.com' for development URLs
   - Must return 'thepia.com' for production URLs
   - Must never return 'api.thepia.com' as RP ID
   - Must handle all subdomains correctly

2. **Credential ID Encoding**:
   - Must maintain consistent base64url encoding
   - Must handle special characters correctly
   - Must preserve exact credential IDs from test data

3. **Challenge Generation**:
   - Must include correct timeout values
   - Must set userVerification to 'required'
   - Must include all required credential fields

### Mock Test Coverage

```typescript
describe('WebAuthn Config Mock', () => {
  it('should handle development URLs correctly', () => {
    const devRequest = new Request('https://dev.thepia.com/auth/webauthn/challenge');
    expect(getRpIdFromRequest(devRequest)).toBe('dev.thepia.com');
  });

  it('should handle production URLs correctly', () => {
    const prodRequest = new Request('https://thepia.com/auth/webauthn/challenge');
    expect(getRpIdFromRequest(prodRequest)).toBe('thepia.com');
  });

  it('should never use api subdomain as RP ID', () => {
    const apiRequest = new Request('https://api.thepia.com/auth/webauthn/challenge');
    expect(getRpIdFromRequest(apiRequest)).not.toBe('api.thepia.com');
  });
});
```

### Mock Validation Checklist

- [ ] RP ID returns correct value for all test URLs
- [ ] Credential IDs maintain exact encoding
- [ ] Challenge options include all required fields
- [ ] Error cases return correct status codes
- [ ] Mock behavior matches production config
- [ ] Mock tests cover all edge cases

### Common Mock Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| Wrong RP ID | Tests fail with "Invalid RP ID" | Verify URL parsing in mock |
| Encoding mismatch | Credential ID comparison fails | Check base64url conversion |
| Missing fields | Challenge generation fails | Verify all required options |
| Status code mismatch | Tests expect 200 but get 500 | Check error handling in mock |

### Mock Maintenance

1. **Regular Updates**:
   - Review mock behavior monthly
   - Update when config changes
   - Verify against production

2. **Test Coverage**:
   - Run mock tests before integration tests
   - Verify all edge cases
   - Check error scenarios

3. **Documentation**:
   - Keep mock behavior documented
   - Update when requirements change
   - Include examples for common cases

---

**Total Test Time**: ~5 minutes (30s automated + 4.5min manual)  
**Success Rate Target**: 95%+ registration, 98%+ authentication  
**Performance Target**: <3s registration, <2s authentication

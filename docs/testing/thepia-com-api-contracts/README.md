# thepia.com API Contract Documentation Templates

**⚠️ CRITICAL**: These templates must be copied to `thepia.com/docs/auth/` to establish API contract authority.

## 📁 Directory Structure to Create in thepia.com

```
thepia.com/docs/auth/
├── README.md                           # API overview (copy from api-overview.md)
├── api-contracts/
│   ├── README.md                       # API contracts overview
│   ├── authentication-endpoints.md    # Complete endpoint specifications
│   ├── request-response-schemas.md     # JSON schemas with examples
│   ├── error-codes-catalog.md         # All error scenarios
│   └── rate-limiting-specs.md         # API throttling rules
├── test-scenarios/
│   ├── README.md                      # Test organization strategy
│   ├── user-authentication.md         # User auth test scenarios (T001-T010)
│   ├── token-management.md           # Token lifecycle scenarios (T011-T020)
│   ├── error-handling.md             # Error response scenarios (T021-T030)
│   └── security-edge-cases.md        # Security test scenarios (T031-T040)
└── implementation/
    ├── deployment-guide.md           # Server deployment
    ├── database-schema.md            # Auth database design
    └── security-requirements.md      # Security implementation
```

## 🚀 Quick Setup Instructions

1. **Copy all template files** from this directory to `thepia.com/docs/auth/`
2. **Update placeholder values** marked with `[TODO]` in templates
3. **Validate against actual API implementation** 
4. **Set up test accounts** as specified in test scenario documentation
5. **Create API contract tests** in `thepia.com/tests/auth/contracts/`

## 📋 Template Files Included

### **Core API Documentation**
- `api-overview.md` → Copy to `thepia.com/docs/auth/README.md`
- `api-contracts/README.md` - API contracts overview
- `api-contracts/authentication-endpoints.md` - Complete endpoint specifications
- `api-contracts/request-response-schemas.md` - JSON schemas with examples
- `api-contracts/error-codes-catalog.md` - Comprehensive error catalog

### **Test Scenario Documentation**
- `test-scenarios/README.md` - Test organization strategy
- `test-scenarios/user-authentication.md` - User authentication scenarios (T001-T010)
- `test-scenarios/token-management.md` - Token lifecycle scenarios (T011-T020)
- `test-scenarios/error-handling.md` - Error response scenarios (T021-T030)

### **Implementation Guides**
- `implementation/per-device-passkey-architecture.md` - **🚨 CRITICAL** - Per-device storage architecture
- `implementation/test-data-setup.md` - Auth0 test account setup scripts
- `implementation/api-server-requirements.md` - Deno/Auth0 implementation requirements

## ⚠️ Critical Information Needed

The following information must be provided by the thepia.com backend team:

### **API Server Details**
- [ ] **Base URL format** - Is it `https://dev.thepia.com:8443` for local, `https://api.thepia.com` for production?
- [ ] **Authentication method** - How does the API authenticate requests?
- [ ] **Rate limiting** - What are the actual rate limits and throttling rules?
- [ ] **Database schema** - What user data fields exist?

### **Endpoint Implementation Status**
- [ ] **POST /auth/check-user** - ✅ Implemented (based on integration tests)
- [ ] **POST /auth/webauthn/challenge** - ✅ Implemented (based on integration tests)
- [ ] **POST /auth/webauthn/verify** - ✅ Implemented (based on integration tests)
- [x] **POST /auth/start-passwordless** - ✅ Implemented and working
- [ ] **POST /auth/refresh** - Status unknown
- [ ] **POST /auth/signout** - Status unknown
- [ ] **GET /auth/profile** - Status unknown

### **Test Data Requirements**
- [ ] **test-with-passkey@thepia.net** - User account with registered passkey
- [ ] **test-without-passkey@thepia.net** - User account without passkey
- [ ] **Database seeding scripts** - How to create test accounts
- [ ] **Environment setup** - Local vs production test data

## 🔗 Integration with flows-auth

Once thepia.com API contracts are created:

1. **Update flows-auth integration tests** to reference specific contract scenarios
2. **Create flows-auth/docs/auth/api-integration/server-contracts.md** that references thepia.com contracts
3. **Ensure test alignment** between API contract tests and integration tests
4. **Establish change coordination** process between repositories

## 📊 Success Criteria

- [ ] **Complete API endpoint documentation** - All endpoints have full specifications
- [ ] **Test scenario catalog** - All behaviors organized by scenario ID (T001, T002, etc.)
- [ ] **Working test accounts** - Required test data exists in API server
- [ ] **API contract tests** - thepia.com/tests/auth/contracts/ validates all scenarios
- [ ] **Integration test alignment** - flows-auth tests reference specific API contracts

---

## 🚨 URGENT: Architecture Gap Analysis

### **Critical Issues Identified**
1. **Per-device passkey storage missing** - Current API doesn't handle multiple devices per user
2. **Domain isolation not implemented** - thepia.com/thepia.net credentials should be separate
3. **Auth0 schema extension needed** - Custom metadata structure required
4. **Device management endpoints missing** - No way for users to manage their devices

### **Technology Stack Corrections**
- **Runtime**: Deno (not Node.js) with specific permissions
- **Backend**: Auth0 database (not MySQL/PostgreSQL) 
- **Libraries**: @simplewebauthn/server for Deno
- **Validation**: Zod schemas (not Joi) for input validation
- **Rate limiting**: In-memory or Redis (not express-rate-limit)

### **Immediate Action Required**
1. **Review per-device architecture document** - Critical design decisions needed
2. **Plan Auth0 metadata schema** - Define exact structure for device storage  
3. **Update API implementation** - Modify all endpoints for per-device logic
4. **Create migration strategy** - Handle existing users with single credentials

**Next Steps**: Address per-device passkey architecture first, then copy templates to thepia.com repository.
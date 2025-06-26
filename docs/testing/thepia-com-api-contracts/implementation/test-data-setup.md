# Test Data Setup Requirements

**Comprehensive guide for setting up required test accounts and data for API contract testing**

## Overview

This document defines the test data requirements for validating API contracts across all authentication endpoints. Test data must be consistent across all environments (local development, staging, CI/CD).

---

## Required Test Accounts

### **Core Test Accounts (Auth0 Structure)**

#### **test-with-passkey@thepia.net**
- **Purpose**: User with registered WebAuthn credentials on multiple devices/domains
- **Auth0 User ID**: `auth0|test_with_passkey_001`
- **Status**: Active
- **Credentials**: Multiple passkeys across domains
- **Used in scenarios**: T001, T011, T021, T032, T051-T055

#### **test-without-passkey@thepia.net**
- **Purpose**: User without any WebAuthn credentials
- **Auth0 User ID**: `auth0|test_without_passkey_001`
- **Status**: Active
- **Credentials**: None
- **Used in scenarios**: T002, T012

#### **test-magic-link@thepia.net**
- **Purpose**: User for magic link testing
- **Auth0 User ID**: `auth0|test_magic_link_001`
- **Status**: Active
- **Credentials**: None
- **Used in scenarios**: T031

#### **test-suspended@thepia.net**
- **Purpose**: Suspended user account
- **Auth0 User ID**: `auth0|test_suspended_001`
- **Status**: Suspended
- **Credentials**: None
- **Used in scenarios**: T007

#### **test-multi-device@thepia.net** (NEW)
- **Purpose**: User with multiple devices and cross-domain credentials
- **Auth0 User ID**: `auth0|test_multi_device_001`
- **Status**: Active
- **Credentials**: Multiple devices on both thepia.com and thepia.net
- **Used in scenarios**: T051-T060 (per-device testing)

### **Test Accounts That Should NOT Exist**
- **test-new-user@thepia.net** - Used for T003 (new user scenarios)
- **nonexistent@thepia.net** - Used for T013 (user not found scenarios)
- **test-cross-domain-new@thepia.net** - Used for cross-domain registration scenarios

---

## Auth0 Data Structure Requirements

### **Auth0 User Metadata Schema**

Users are stored in Auth0 with extended metadata structure:

```typescript
interface Auth0TestUser {
  user_id: string;           // Auth0 format: "auth0|test_user_001"
  email: string;
  name?: string;
  email_verified: boolean;
  
  // Custom application metadata
  app_metadata: {
    thepia: {
      status: 'active' | 'suspended' | 'deleted';
      created_at: string;
      updated_at: string;
      
      // Per-domain credentials and settings
      domains: {
        'thepia.com': {
          credentials: WebAuthnCredential[];
          last_signin?: string;
          settings?: {
            preferred_auth_method?: 'passkey' | 'magic_link';
            session_timeout?: number;
          };
        };
        'thepia.net': {
          credentials: WebAuthnCredential[];
          last_signin?: string;
          settings?: {
            preferred_auth_method?: 'passkey' | 'magic_link';
            session_timeout?: number;
          };
        };
      };
      
      // User preferences
      preferences?: {
        default_domain?: string;
        device_naming?: boolean;
        security_notifications?: boolean;
      };
    };
  };
  
  // User-modifiable metadata
  user_metadata: {
    preferences?: Record<string, any>;
  };
}

interface WebAuthnCredential {
  id: string;                    // Unique credential ID
  credential_id: string;         // Base64URL credential ID
  public_key: string;           // Base64URL public key
  counter: number;              // Signature counter
  device_name: string;          // "iPhone 15 Pro", "MacBook Pro"
  device_type?: 'mobile' | 'desktop' | 'tablet' | 'security_key';
  transports: string[];         // ['internal', 'usb', 'nfc', 'ble']
  created_at: string;          // ISO timestamp
  last_used?: string;          // ISO timestamp
  usage_count: number;          // Times used
  is_active: boolean;           // Can be disabled
  user_agent?: string;          // Registration context
  ip_address?: string;          // Registration IP
}
```

---

## Auth0 Test Data Setup Scripts

### **Auth0 Management API Setup Script**
```typescript
// File: setup-auth0-test-data.ts
import { ManagementClient } from 'auth0';

const auth0Management = new ManagementClient({
  domain: Deno.env.get('AUTH0_DOMAIN')!,
  clientId: Deno.env.get('AUTH0_CLIENT_ID')!,
  clientSecret: Deno.env.get('AUTH0_CLIENT_SECRET')!,
  scope: 'read:users write:users create:users update:users'
});

const TEST_USERS = [
  {
    email: 'test-with-passkey@thepia.net',
    name: 'Test User With Passkey',
    password: 'TempPassword123!', // Will be disabled after passkey setup
    email_verified: true,
    app_metadata: {
      thepia: {
        status: 'active',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-22T15:30:00Z',
        domains: {
          'thepia.com': {
            credentials: [
              {
                id: 'cred_test_iphone_thepia_com',
                credential_id: 'dGVzdC1jcmVkZW50aWFsLWlkLTEtY29t',
                public_key: 'test-public-key-data-base64-com',
                counter: 5,
                device_name: 'Test iPhone',
                device_type: 'mobile',
                transports: ['internal'],
                created_at: '2024-01-15T10:15:00Z',
                last_used: '2024-01-22T09:30:00Z',
                usage_count: 5,
                is_active: true,
                user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
                ip_address: '192.168.1.100'
              }
            ],
            last_signin: '2024-01-22T09:30:00Z'
          },
          'thepia.net': {
            credentials: [
              {
                id: 'cred_test_iphone_thepia_net',
                credential_id: 'dGVzdC1jcmVkZW50aWFsLWlkLTEtbmV0',
                public_key: 'test-public-key-data-base64-net',
                counter: 8,
                device_name: 'Test iPhone',
                device_type: 'mobile',
                transports: ['internal'],
                created_at: '2024-01-15T10:30:00Z',
                last_used: '2024-01-22T15:30:00Z',
                usage_count: 8,
                is_active: true,
                user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
                ip_address: '192.168.1.100'
              }
            ],
            last_signin: '2024-01-22T15:30:00Z'
          }
        }
      }
    }
  },
  
  {
    email: 'test-multi-device@thepia.net',
    name: 'Test Multi-Device User',
    password: 'TempPassword123!',
    email_verified: true,
    app_metadata: {
      thepia: {
        status: 'active',
        created_at: '2024-01-10T08:00:00Z',
        updated_at: '2024-01-22T18:45:00Z',
        domains: {
          'thepia.com': {
            credentials: [
              {
                id: 'cred_test_iphone_multi_com',
                credential_id: 'dGVzdC1tdWx0aS1pcGhvbmUtY29t',
                public_key: 'test-multi-iphone-key-com',
                counter: 12,
                device_name: 'iPhone 15 Pro',
                device_type: 'mobile',
                transports: ['internal'],
                created_at: '2024-01-10T08:15:00Z',
                last_used: '2024-01-22T10:15:00Z',
                usage_count: 12,
                is_active: true
              },
              {
                id: 'cred_test_macbook_multi_com',
                credential_id: 'dGVzdC1tdWx0aS1tYWNib29rLWNvbQ',
                public_key: 'test-multi-macbook-key-com',
                counter: 6,
                device_name: 'MacBook Pro 16-inch',
                device_type: 'desktop',
                transports: ['internal', 'usb'],
                created_at: '2024-01-12T14:20:00Z',
                last_used: '2024-01-21T16:45:00Z',
                usage_count: 6,
                is_active: true
              }
            ]
          },
          'thepia.net': {
            credentials: [
              {
                id: 'cred_test_iphone_multi_net',
                credential_id: 'dGVzdC1tdWx0aS1pcGhvbmUtbmV0',
                public_key: 'test-multi-iphone-key-net',
                counter: 18,
                device_name: 'iPhone 15 Pro',
                device_type: 'mobile',
                transports: ['internal'],
                created_at: '2024-01-10T08:30:00Z',
                last_used: '2024-01-22T18:45:00Z',
                usage_count: 18,
                is_active: true
              },
              {
                id: 'cred_test_ipad_multi_net',
                credential_id: 'dGVzdC1tdWx0aS1pcGFkLW5ldA',
                public_key: 'test-multi-ipad-key-net',
                counter: 3,
                device_name: 'iPad Pro',
                device_type: 'tablet',
                transports: ['internal'],
                created_at: '2024-01-18T11:00:00Z',
                last_used: '2024-01-20T19:15:00Z',
                usage_count: 3,
                is_active: true
              }
            ]
          }
        },
        preferences: {
          default_domain: 'thepia.net',
          device_naming: true,
          security_notifications: true
        }
      }
    }
  },
  
  {
    email: 'test-without-passkey@thepia.net',
    name: 'Test User Without Passkey',
    password: 'TempPassword123!',
    email_verified: true,
    app_metadata: {
      thepia: {
        status: 'active',
        created_at: '2024-01-20T12:00:00Z',
        updated_at: '2024-01-20T12:00:00Z',
        domains: {
          'thepia.com': { credentials: [] },
          'thepia.net': { credentials: [] }
        }
      }
    }
  },
  
  {
    email: 'test-suspended@thepia.net',
    name: 'Test Suspended User',
    password: 'TempPassword123!',
    email_verified: true,
    app_metadata: {
      thepia: {
        status: 'suspended',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-15T14:30:00Z',
        domains: {
          'thepia.com': { credentials: [] },
          'thepia.net': { credentials: [] }
        }
      }
    }
  }
];

async function setupTestUsers() {
  console.log('🧹 Cleaning up existing test users...');
  
  // Find and delete existing test users
  for (const testUser of TEST_USERS) {
    try {
      const existingUsers = await auth0Management.getUsersByEmail(testUser.email);
      for (const user of existingUsers) {
        await auth0Management.deleteUser({ id: user.user_id });
        console.log(`Deleted existing user: ${user.email}`);
      }
    } catch (error) {
      console.log(`No existing user found for ${testUser.email}`);
    }
  }
  
  console.log('👥 Creating test users...');
  
  // Create new test users
  for (const testUser of TEST_USERS) {
    try {
      const newUser = await auth0Management.createUser({
        connection: 'Username-Password-Authentication',
        ...testUser
      });
      console.log(`Created user: ${newUser.email} (${newUser.user_id})`);
    } catch (error) {
      console.error(`Failed to create user ${testUser.email}:`, error);
    }
  }
  
  console.log('✅ Test user setup complete!');
}

if (import.meta.main) {
  await setupTestUsers();
}
```

### **Environment Setup Script**
```bash
#!/bin/bash
# File: setup-test-environment.sh

set -e

echo "🔧 Setting up test environment for Authentication API..."

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_NAME=${DB_NAME:-auth_test}
DB_USER=${DB_USER:-test_user}
DB_PASS=${DB_PASS:-test_password}

# Check if database is accessible
echo "📊 Checking database connection..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -e "SELECT 1;" "$DB_NAME"

# Run test data setup
echo "🗃️ Setting up test data..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < setup-test-data.sql

# Verify test data
echo "✅ Verifying test data setup..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
SELECT 
    u.email, 
    u.status,
    COUNT(wc.id) as credential_count
FROM users u
LEFT JOIN webauthn_credentials wc ON u.id = wc.user_id
WHERE u.email LIKE '%thepia.net'
GROUP BY u.id, u.email, u.status;
"

echo "🎉 Test environment setup complete!"
```

### **Deno Environment Setup Script**
```bash
#!/bin/bash
# File: setup-auth0-environment.sh

set -e

echo "🔧 Setting up Auth0 test environment..."

# Check required environment variables
if [ -z "$AUTH0_DOMAIN" ] || [ -z "$AUTH0_CLIENT_ID" ] || [ -z "$AUTH0_CLIENT_SECRET" ]; then
    echo "❌ Missing required Auth0 environment variables:"
    echo "   AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET"
    exit 1
fi

echo "📊 Auth0 Configuration:"
echo "   Domain: $AUTH0_DOMAIN"
echo "   Client ID: $AUTH0_CLIENT_ID"
echo "   Client Secret: [REDACTED]"

# Run the Deno setup script
echo "🗃️ Setting up Auth0 test data..."
deno run \
  --allow-net \
  --allow-env \
  setup-auth0-test-data.ts

echo "✅ Verifying test data setup..."
# Run validation script
deno run \
  --allow-net \
  --allow-env \
  validate-auth0-test-data.ts

echo "🎉 Auth0 test environment setup complete!"
```

### **Test Data Validation Script**
```typescript
// File: validate-auth0-test-data.ts
import { ManagementClient } from 'auth0';

const auth0Management = new ManagementClient({
  domain: Deno.env.get('AUTH0_DOMAIN')!,
  clientId: Deno.env.get('AUTH0_CLIENT_ID')!,
  clientSecret: Deno.env.get('AUTH0_CLIENT_SECRET')!,
  scope: 'read:users'
});

const REQUIRED_TEST_EMAILS = [
  'test-with-passkey@thepia.net',
  'test-multi-device@thepia.net',
  'test-without-passkey@thepia.net',
  'test-suspended@thepia.net'
];

async function validateTestData() {
  console.log('🔍 Validating Auth0 test data...');
  
  for (const email of REQUIRED_TEST_EMAILS) {
    try {
      const users = await auth0Management.getUsersByEmail(email);
      
      if (users.length === 0) {
        console.log(`❌ ${email} - NOT FOUND`);
        continue;
      }
      
      const user = users[0];
      const thepiaMeta = user.app_metadata?.thepia;
      
      if (!thepiaMeta) {
        console.log(`❌ ${email} - Missing thepia metadata`);
        continue;
      }
      
      const comCreds = thepiaMeta.domains?.['thepia.com']?.credentials?.length || 0;
      const netCreds = thepiaMeta.domains?.['thepia.net']?.credentials?.length || 0;
      
      console.log(`✅ ${email} - Status: ${thepiaMeta.status}, Credentials: COM(${comCreds}) NET(${netCreds})`);
      
    } catch (error) {
      console.log(`❌ ${email} - ERROR: ${error.message}`);
    }
  }
  
  // Check that non-existent accounts don't exist
  const nonExistentEmails = [
    'test-new-user@thepia.net',
    'nonexistent@thepia.net'
  ];
  
  for (const email of nonExistentEmails) {
    try {
      const users = await auth0Management.getUsersByEmail(email);
      if (users.length === 0) {
        console.log(`✅ ${email} - Correctly does not exist`);
      } else {
        console.log(`❌ ${email} - Should not exist but found ${users.length} users`);
      }
    } catch (error) {
      console.log(`✅ ${email} - Correctly does not exist`);
    }
  }
  
  console.log('🎯 Auth0 test data validation complete!');
}

if (import.meta.main) {
  await validateTestData();
}
```

---

## Environment-Specific Configurations

### **Local Development**
```bash
# .env.local
DB_HOST=localhost
DB_PORT=3306
DB_NAME=auth_dev
DB_USER=dev_user
DB_PASS=dev_password

# API Base URL
API_BASE_URL=https://dev.thepia.com:8443
```

### **CI/CD Environment**
```bash
# .env.ci
DB_HOST=mysql-ci
DB_PORT=3306
DB_NAME=auth_test_ci
DB_USER=ci_user
DB_PASS=ci_password

# API Base URL  
API_BASE_URL=https://api-ci.thepia.com
```

### **Staging Environment**
```bash
# .env.staging
DB_HOST=mysql-staging
DB_PORT=3306
DB_NAME=auth_staging
DB_USER=staging_user
DB_PASS=staging_password

# API Base URL
API_BASE_URL=https://api-staging.thepia.com
```

---

## Test Data Validation

### **Validation Script**
```bash
#!/bin/bash
# File: validate-test-data.sh

echo "🔍 Validating test data setup..."

# Check required test accounts exist
REQUIRED_EMAILS=(
    "test-with-passkey@thepia.net"
    "test-without-passkey@thepia.net"
    "test-magic-link@thepia.net"
    "test-suspended@thepia.net"
)

for email in "${REQUIRED_EMAILS[@]}"; do
    echo "Checking $email..."
    
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$email\"}" \
        "$API_BASE_URL/auth/check-user")
    
    if echo "$response" | grep -q "userExists"; then
        echo "✅ $email - OK"
    else
        echo "❌ $email - FAILED"
        echo "Response: $response"
    fi
done

# Check that non-existent accounts don't exist
echo "Checking non-existent accounts..."
response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"email": "test-new-user@thepia.net"}' \
    "$API_BASE_URL/auth/check-user")

if echo "$response" | grep -q '"userExists":false'; then
    echo "✅ Non-existent user handling - OK"
else
    echo "❌ Non-existent user handling - FAILED"
    echo "Response: $response"
fi

# Validate passkey user has credential
echo "Checking passkey user has credential..."
response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"email": "test-with-passkey@thepia.net"}' \
    "$API_BASE_URL/auth/check-user")

if echo "$response" | grep -q '"hasPasskey":true'; then
    echo "✅ Passkey user credential - OK"
else
    echo "❌ Passkey user credential - FAILED"
    echo "Response: $response"
fi

echo "🎯 Test data validation complete!"
```

### **Automated Validation in CI**
```yaml
# .github/workflows/validate-test-data.yml
name: Validate Test Data

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  validate-test-data:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: auth_test
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup test database
        run: |
          mysql -h 127.0.0.1 -u root -proot auth_test < setup-test-data.sql
      
      - name: Start API server
        run: |
          npm start &
          sleep 10
      
      - name: Validate test data
        run: |
          chmod +x validate-test-data.sh
          ./validate-test-data.sh
```

---

## Troubleshooting

### **Common Issues**

#### **Test accounts not found**
```bash
# Check if accounts were created
mysql -e "SELECT email, status FROM users WHERE email LIKE '%thepia.net';"

# Recreate accounts if missing
mysql < setup-test-data.sql
```

#### **Credential not associated with user**
```bash
# Check credential association
mysql -e "
SELECT u.email, wc.credential_id 
FROM users u 
LEFT JOIN webauthn_credentials wc ON u.id = wc.user_id 
WHERE u.email = 'test-with-passkey@thepia.net';
"
```

#### **API not accessible**
```bash
# Test API connectivity
curl -f "$API_BASE_URL/health" || echo "API not accessible"
```

### **Reset Test Data**
```bash
# Complete reset
mysql -e "
DELETE FROM webauthn_credentials WHERE user_id LIKE 'usr_test_%';
DELETE FROM users WHERE id LIKE 'usr_test_%';
"

# Recreate
mysql < setup-test-data.sql
```

---

## Maintenance

### **Regular Tasks**
- **Weekly**: Validate test data integrity
- **Monthly**: Clean up old challenge records
- **Per release**: Verify test data matches new requirements

### **Updates Required When**
- New test scenarios added
- New user fields introduced
- Credential structure changes
- Additional authentication methods added
# Secrets vs Variables: Comprehensive Guide

## Overview

The thepia.com API server distinguishes between **secrets** and **public variables** to ensure proper security handling across different runtime environments:

- **Local Development**: All variables use `Deno.env.get()`
- **Bunny Edge Scripting**: Secrets use `BunnySDK.secret.get()`, public variables use `Deno.env.get()`

## How to Distinguish Secrets vs Variables

### 1. **Naming Convention Rules** (Primary Method)

The `environment.ts` file uses these patterns to auto-detect secrets:

```typescript
// Lines 55-62 in src/api/utils/environment.ts
if (isBunnyEdge() && (
  prop.includes("SECRET") ||      // ← Any variable with "SECRET"
  prop.includes("TOKEN") ||        // ← Any variable with "TOKEN"
  prop.includes("KEY") ||          // ← Any variable with "KEY"
  prop.includes("PASSWORD") ||     // ← Any variable with "PASSWORD"
  prop === "AUTH0_MANAGEMENT_CLIENT_ID" ||  // ← Explicit exceptions
  prop === "DISCORD_BOT_TOKEN" ||
  prop === "DISCORD_PUBLIC_KEY"
)) {
  return globalThis.BunnySDK?.secret.get(prop);
}
```

### 2. **Secret Categories**

#### **Always Secrets** (use BunnySDK.secret.get() in Bunny)
- `*_SECRET` - Any variable ending with SECRET
- `*_TOKEN` - Any variable ending with TOKEN  
- `*_KEY` - Any variable ending with KEY
- `*_PASSWORD` - Any variable ending with PASSWORD
- `AUTH0_MANAGEMENT_CLIENT_ID` - Auth0 management credentials
- `DISCORD_BOT_TOKEN` - Discord bot token
- `DISCORD_PUBLIC_KEY` - Discord public key

#### **Usually Public** (use Deno.env.get())
- `PUBLIC_*` - Explicitly marked as public
- `*_DOMAIN` - Domain names
- `*_URL` - URLs
- `*_ID` (except management IDs) - Public IDs
- `*_NAME` - Display names
- Configuration values (numbers, booleans, patterns)

### 3. **Examples from Codebase**

#### Secrets (use BunnySDK.secret.get() in Bunny)
```
AUTH0_MANAGEMENT_CLIENT_SECRET    ← Contains "SECRET"
AUTH0_MANAGEMENT_CLIENT_ID        ← Explicit exception
WORKOS_API_KEY                    ← Contains "KEY"
DISCORD_BOT_TOKEN                 ← Contains "TOKEN"
AWS_SECRET_ACCESS_KEY             ← Contains "SECRET"
EMAILJS_ACCESS_TOKEN              ← Contains "TOKEN"
BUNNY_API_KEY                     ← Contains "KEY"
```

#### Public Variables (use Deno.env.get())
```
PUBLIC_AUTH0_DOMAIN               ← Starts with PUBLIC_
PUBLIC_AUTH0_CLIENT_ID            ← Starts with PUBLIC_
PUBLIC_WEBAUTHN_RP_ID             ← Starts with PUBLIC_
AWS_REGION                        ← Configuration value
INVITATION_EXPIRY_HOURS           ← Configuration value
TEST_EMAIL_PATTERNS               ← Configuration value
TRUSTED_DOMAINS                   ← Configuration value
```

## Correlating with .env Files

### .env.example Structure

```bash
# SECRETS (should be in .env.local or GitHub Secrets)
AUTH0_MANAGEMENT_CLIENT_ID=...
AUTH0_MANAGEMENT_CLIENT_SECRET=...
WORKOS_API_KEY=...
AWS_SECRET_ACCESS_KEY=...

# PUBLIC VARIABLES (can be in .env.example)
PUBLIC_AUTH0_DOMAIN=thepia.eu.auth0.com
PUBLIC_WEBAUTHN_RP_ID=thepia.com
AWS_REGION=eu-north-1
INVITATION_EXPIRY_HOURS=168
```

### .env.local (Local Development)

```bash
# All variables here (both secrets and public)
# This file is in .gitignore and never committed
AUTH0_MANAGEMENT_CLIENT_SECRET=your_secret_here
PUBLIC_AUTH0_DOMAIN=thepia.eu.auth0.com
```

### GitHub Secrets

```bash
# Only secrets go here
AUTH0_MANAGEMENT_CLIENT_SECRET
WORKOS_API_KEY
AWS_SECRET_ACCESS_KEY
BUNNY_API_KEY
```

## Updating Bunny Edge Scripting

### Step 1: Identify Which Variables to Add

Use the naming convention rules above to categorize variables:

```bash
# Run this to see all environment variables
grep -E "^[A-Z_]+=" .env.local | sort

# Identify secrets (should contain SECRET, TOKEN, KEY, PASSWORD)
grep -E "(SECRET|TOKEN|KEY|PASSWORD)" .env.local
```

### Step 2: Add to Bunny Dashboard

**For Secrets** (use Bunny's Secret Manager):

1. Go to **Bunny Dashboard** → **Edge Scripting** → Your Script
2. Click **Secrets** tab
3. Add each secret:
   - Name: `AUTH0_MANAGEMENT_CLIENT_SECRET`
   - Value: `your_secret_value`
4. Click **Save**

**For Public Variables** (use Environment Variables):

1. Go to **Bunny Dashboard** → **Edge Scripting** → Your Script
2. Click **Environment Variables** tab
3. Add each variable:
   - Name: `PUBLIC_AUTH0_DOMAIN`
   - Value: `thepia.eu.auth0.com`
4. Click **Save**

### Step 3: Verify in Code

The `environment.ts` proxy automatically routes to the correct source:

```typescript
// In your code - no changes needed!
const domain = envProxy.PUBLIC_AUTH0_DOMAIN;        // Uses Deno.env.get()
const secret = envProxy.AUTH0_MANAGEMENT_CLIENT_SECRET;  // Uses BunnySDK.secret.get()
```

### Step 4: Update Deployment Script

Edit `scripts/deploy-to-bunny.sh` to include all required variables:

```bash
# Add to the script
REQUIRED_SECRETS=(
  "AUTH0_MANAGEMENT_CLIENT_SECRET"
  "WORKOS_API_KEY"
  "AWS_SECRET_ACCESS_KEY"
)

REQUIRED_VARIABLES=(
  "PUBLIC_AUTH0_DOMAIN"
  "PUBLIC_WEBAUTHN_RP_ID"
  "AWS_REGION"
)
```

## Testing Secret/Variable Detection

### Local Development

```bash
# Test that secrets are detected correctly
deno run --allow-env src/api/utils/environment.ts

# Check cache performance
console.log(envProxy.AUTH0_MANAGEMENT_CLIENT_SECRET);  // ~5-10ms
console.log(envProxy.AUTH0_MANAGEMENT_CLIENT_SECRET);  // <1ms (cached)
```

### Bunny Edge Scripting

```typescript
// In your Bunny script
console.log("Secret:", globalThis.BunnySDK?.secret.get("AUTH0_MANAGEMENT_CLIENT_SECRET"));
console.log("Variable:", Deno.env.get("PUBLIC_AUTH0_DOMAIN"));
```

## Adding New Variables

### Checklist

- [ ] Determine if it's a secret (contains SECRET, TOKEN, KEY, PASSWORD, or is sensitive)
- [ ] Add to `.env.example` (only public variables)
- [ ] Add to `.env.local` (all variables for local development)
- [ ] Add to GitHub Secrets (only secrets)
- [ ] Add to Bunny Dashboard (secrets in Secrets tab, variables in Environment Variables tab)
- [ ] Update `scripts/deploy-to-bunny.sh` validation
- [ ] Update `docs/github-actions-environment-variables.md`
- [ ] Test locally: `envProxy.YOUR_VARIABLE_NAME`
- [ ] Test in Bunny: Deploy and verify in logs

## Security Best Practices

1. **Never commit secrets** - Use `.gitignore` for `.env.local`
2. **Use naming conventions** - Makes automatic detection work
3. **Explicit exceptions** - Add to `environment.ts` if naming doesn't match
4. **Rotate regularly** - Especially for API keys and tokens
5. **Audit access** - Check GitHub Actions logs for secret usage
6. **Use least privilege** - Only grant secrets to scripts that need them


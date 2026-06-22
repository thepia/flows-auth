# WebAuthn Environment Setup

This document explains how to configure WebAuthn for both development and production environments, including HTTPS requirements and domain setup.

## WebAuthn Domain Matching Requirement

**Critical Security Requirement**: The RP ID (Relying Party ID) must exactly match the domain shown in the browser's address bar when the WebAuthn operation (like signing in with a passkey) is initiated. This is a fundamental security requirement of the WebAuthn specification.

For example:

- If a user visits `https://dev.thepia.com` and clicks "Sign in with passkey", the RP ID must be `dev.thepia.com`
- If a user visits `https://thepia.com` and clicks "Sign in with passkey", the RP ID must be `thepia.com`

This means:

- The RP ID is determined by where the WebAuthn popup appears, not where the API is hosted
- The RP ID cannot be a subdomain of the current domain (e.g., if on `thepia.com`, you cannot use `api.thepia.com` as the RP ID)
- The RP ID must match the domain in the browser's address bar exactly

## HTTPS Requirements

WebAuthn (passkeys) requires a secure context to function properly:

- **Safari**: Requires HTTPS even for local development
- **Chrome**: Allows WebAuthn over HTTP on localhost, but HTTPS is recommended
- **Firefox**: Similar to Chrome, may require enabling WebAuthn in about:config

## Development Setup Options

### Option 1: Self-Signed Certificates (Recommended)

- ✅ **Simple and fast** - Works immediately
- ✅ **No external dependencies** - Works offline
- ✅ **Perfect for development** - Meets WebAuthn requirements
- ⚠️ **Browser warnings** - Shows "Not secure" (can be trusted manually)

#### Quick Setup

1. **Run the setup script:**

   ```bash
   pnpm run setup:https
   ```

2. **Trust the certificate (eliminates warnings):**

   ```bash
   pnpm run trust:cert
   ```

3. **Start the dev server:**

   ```bash
   pnpm dev
   ```

4. **Access your site:**
   - Open: `https://thepia.local:4321`
   - No certificate warnings if you ran `trust:cert`

### Option 2: Let's Encrypt Certificates

- ✅ **No browser warnings** - Real trusted certificates
- ✅ **Production-like** - Exactly mirrors production setup
- ❌ **Complex setup** - Requires domain ownership and DNS management
- ❌ **Internet required** - Needs connection to Let's Encrypt

#### Setup Steps

1. **Set up DNS**: Add `dev.thepia.com` A record pointing to `127.0.0.1`
2. **Run setup**: `pnpm run setup:letsencrypt`
3. **Update hosts**: Add `127.0.0.1 dev.thepia.com` to `/etc/hosts`
4. **Configure WebAuthn**: Set environment variables:

```bash
PUBLIC_WEBAUTHN_RP_ID=dev.thepia.com
PUBLIC_WEBAUTHN_ORIGIN=https://dev.thepia.com:4321
```

**Note:** This requires domain ownership and DNS management. For simple development, `thepia.local` with self-signed certificates is recommended.

## Environment Variables

The WebAuthn system uses the following environment variables:

- `PUBLIC_WEBAUTHN_RP_ID`: The Relying Party ID (must match the domain in browser's address bar)
- `PUBLIC_WEBAUTHN_RP_NAME`: The Relying Party name (display name)

You can override the default configuration:

1. **Leave unset** - The system will automatically use:
   - Development: `dev.thepia.com` or `thepia.local` (based on current domain)
   - Production: `thepia.com`
2. **Set explicitly** - Override for custom domains (must match browser's domain):

```bash
PUBLIC_WEBAUTHN_RP_ID=thepia.local
PUBLIC_WEBAUTHN_ORIGIN=http://thepia.local:4321
```

## Development Setup

For local development, the system automatically uses:

- **RP ID**: `dev.thepia.com` or `thepia.local` (matches browser's domain)
- **Origin**: `https://dev.thepia.com:4321` or `http://thepia.local:4321`

### Environment Variables for Development

You can either:

1. **Leave unset** - The system will automatically use the domain shown in the browser
2. **Set explicitly** in your `.env` file (must match browser's domain):

   ```env
   PUBLIC_WEBAUTHN_RP_ID=thepia.local
   PUBLIC_WEBAUTHN_RP_NAME=Thepia
   ```

## Production Setup

For production, set these environment variables:

```env
PUBLIC_WEBAUTHN_RP_ID=thepia.com
PUBLIC_WEBAUTHN_RP_NAME=Thepia
```

The system will automatically use:

- **RP ID**: `thepia.com` (matches the domain in browser's address bar)
- **Origin**: `https://thepia.com`

## How It Works

The WebAuthn configuration utility (`src/utils/webauthn-config.ts`) automatically detects the environment:

1. **Development Mode** (when `import.meta.env.DEV` is true):
   - Uses the current domain in browser's address bar as RP ID
   - For `dev.thepia.com`: Uses `dev.thepia.com` as RP ID
   - For `thepia.local`: Uses `thepia.local` as RP ID

2. **Production Mode**:
   - Uses `thepia.com` as RP ID (matches browser's domain)
   - Uses `https://thepia.com` as origin

## Testing

### Development Testing

1. Add `127.0.0.1 thepia.local` to `/etc/hosts`
2. Start dev server: `pnpm run dev`
3. Visit: `http://thepia.local:4321`
4. Test passkey registration

### Production Testing

1. Set environment variables for your domain
2. Deploy to production
3. Test passkey registration on the live domain

## Troubleshooting

### "RP ID is invalid for this domain" Error

This means the RP ID doesn't match the domain in the browser's address bar:

- **Development**: Make sure you're accessing `thepia.local:4321` or `dev.thepia.com:4321`
- **Production**: Verify `PUBLIC_WEBAUTHN_RP_ID` matches the domain in browser's address bar

### Passkey Not Working

1. Ensure you're using HTTPS in production (required for WebAuthn)
2. Check that the RP ID exactly matches the domain in browser's address bar
3. Verify environment variables are set correctly
4. Remember: RP ID must match where the WebAuthn popup appears, not where the API is hosted

## Manual Certificate Setup (if script fails)

### 1. Generate SSL Certificates

```bash
mkdir -p certs

openssl req -x509 \
    -out certs/localhost.pem \
    -keyout certs/localhost-key.pem \
    -newkey rsa:2048 \
    -nodes \
    -sha256 \
    -subj '/CN=thepia.local' \
    -extensions EXT \
    -config <(printf "[dn]\nCN=thepia.local\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:thepia.local,DNS:localhost,IP:127.0.0.1\nkeyUsage=keyEncipherment,dataEncipherment\nextendedKeyUsage=serverAuth")
```

### 2. Trust the Certificate (Optional)

For a better development experience, you can add the certificate to your system keychain:

**macOS:**

```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain certs/localhost.pem
```

**Or manually:**

1. Open Keychain Access
2. Drag `certs/localhost.pem` to the "System" keychain
3. Double-click the certificate
4. Expand "Trust" section
5. Set "When using this certificate" to "Always Trust"

## Security Notes

- The generated certificates are **self-signed** and only for development
- Never use these certificates in production
- The `certs/` directory is gitignored to prevent committing certificates
- Production uses proper SSL certificates from your hosting provider

## Testing WebAuthn

1. **Access via HTTPS:** `https://thepia.local:4321`
2. **Test WebAuthn support:** Visit `https://thepia.local:4321/test-error-reporting`
3. **Click "Test WebAuthn Support"** to verify detection
4. **Try authentication** - the passkey prompt should now appear

## Browser-Specific Notes

### Safari

- **Requires HTTPS** even for localhost
- May show certificate warnings - click "Advanced" → "Proceed"
- WebAuthn should work after accepting the certificate

### Chrome

- Works with HTTP on localhost, but HTTPS is recommended
- May show "Not secure" warning - this is normal for self-signed certificates
- WebAuthn should work immediately

### Firefox

- Similar to Chrome
- May require enabling WebAuthn in about:config for development

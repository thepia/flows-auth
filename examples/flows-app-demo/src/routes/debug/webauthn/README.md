# WebAuthn Debugger

A comprehensive testing and debugging tool for WebAuthn/Passkey functionality, inspired by [webauthn.me](https://webauthn.me/debugger).

## Features

### WebAuthn Support Detection
- Detects browser WebAuthn support
- Tests for Conditional UI availability
- Checks platform authenticator availability
- Shows current domain and RP ID configuration

### Credential Creation Testing
- **Discoverable Credentials**: Creates resident keys that store user.id
- **Non-Discoverable Credentials**: Creates credentials without storing user data
- Tests different authenticator selection criteria
- Validates credential properties via `credProps` extension

### Authentication Testing
- **Traditional Authentication**: Uses specific credential ID
- **Discoverable Authentication**: Allows user to pick from stored credentials
- **Conditional UI Testing**: Tests autofill behavior in username fields
- Validates user handle return in authentication responses

### Configuration Options
- Configurable RP ID and RP Name
- Custom user ID, username, and display name
- Real-time updates to test parameters
- Persistent storage of test credentials

### Debug Information
- Complete credential metadata display
- Raw ArrayBuffer lengths and encodings
- Base64URL conversion utilities
- Detailed error messages and stack traces
- Timestamped test result history

## Usage

1. **Access the Debugger**: Navigate to `/debug/webauthn` in the flows-app-demo
2. **Configure Settings**: Update RP ID, user information as needed
3. **Create Credentials**: Test both discoverable and non-discoverable credential creation
4. **Test Authentication**: Try different authentication flows
5. **Review Results**: Examine detailed output for each test

## Technical Details

### Credential Storage
- Discoverable credentials store user.id on the authenticator
- Non-discoverable credentials require server-side credential ID storage
- Uses `credProps` extension to verify actual credential properties

### User Handle Testing
- Tests whether user.id is returned as `userHandle` during authentication
- Validates data consistency between registration and authentication
- Demonstrates difference between discoverable vs non-discoverable behavior

### Browser Compatibility
- Requires HTTPS for WebAuthn functionality
- Tests platform-specific authenticator features
- Validates conditional UI support (Chrome/Edge)

## Development

This debugger is built using:
- **Svelte**: Component framework
- **TypeScript**: Type safety for WebAuthn APIs
- **Native WebAuthn APIs**: No external dependencies
- **Tailwind CSS**: Utility-first styling

## Comparison to webauthn.me

This implementation provides:
- ✅ Open source (MIT license like Auth0's webauthn.me)
- ✅ Integrated with flows-auth testing environment
- ✅ Real credential creation and authentication testing
- ✅ Detailed debug output and error handling
- ✅ Configurable test parameters
- ✅ Resident key / discoverable credential focus

Unlike webauthn.me, this tool is:
- Focused on practical testing scenarios
- Integrated with actual authentication flows
- Designed for developers working with passkeys
- Optimized for mobile/desktop platform authenticators

## Security Notes

⚠️ **Development Only**: This debugger is for testing purposes only
⚠️ **Test Data**: All credentials created are for testing - don't use for production
⚠️ **Storage**: Test credentials are stored in localStorage - clear when done testing
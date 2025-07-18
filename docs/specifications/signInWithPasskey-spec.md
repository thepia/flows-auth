# signInWithPasskey Specification

## Functional Requirements

### FR1: Input Validation
- **FR1.1**: MUST validate `email` parameter is non-empty string
- **FR1.2**: MUST validate `email` parameter matches email format
- **FR1.3**: MUST default `conditional` parameter to `false` when not provided
- **FR1.4**: MUST validate WebAuthn support before proceeding

### FR2: Authentication Flow
- **FR2.1**: MUST call `api.checkEmail(email)` to retrieve `userId`
- **FR2.2**: MUST validate user exists (`userCheck.exists === true`)
- **FR2.3**: MUST validate user has `userId` field
- **FR2.4**: MUST call `api.getPasskeyChallenge(email)` to get WebAuthn options
- **FR2.5**: MUST call `authenticateWithPasskey(challenge, conditional)`
- **FR2.6**: MUST serialize credential using `serializeCredential()`
- **FR2.7**: MUST call `api.signInWithPasskey({userId, authResponse})`

### FR3: Response Processing
- **FR3.1**: MUST handle response format: `{success: true, tokens: {...}, user: {...}}`
- **FR3.2**: MUST handle legacy format: `{step: 'success', accessToken: '...', user: {...}}`
- **FR3.3**: MUST extract `accessToken` from `response.accessToken` OR `response.tokens.accessToken`
- **FR3.4**: MUST extract `refreshToken` from `response.refreshToken` OR `response.tokens.refreshToken`
- **FR3.5**: MUST extract `expiresAt` from `response.tokens.expiresAt` when present
- **FR3.6**: MUST determine success from `response.step === 'success'` OR `response.success === true`

### FR4: Session Management
- **FR4.1**: MUST call `saveAuthSession()` when authentication succeeds
- **FR4.2**: MUST pass normalized `SignInResponse` format to `saveAuthSession()`
- **FR4.3**: MUST pass `'passkey'` as authMethod to `saveAuthSession()`
- **FR4.4**: MUST NOT call `saveAuthSession()` when authentication fails

### FR5: State Management
- **FR5.1**: MUST update store state to `'authenticated'` on success
- **FR5.2**: MUST set `user` field in store on success
- **FR5.3**: MUST set `accessToken` field in store on success
- **FR5.4**: MUST set `refreshToken` field in store on success
- **FR5.5**: MUST set `expiresAt` field in store on success
- **FR5.6**: MUST clear `error` field in store on success
- **FR5.7**: MUST NOT update store state on failure

### FR6: Event Emission
- **FR6.1**: MUST emit `sign_in_started` event when `conditional === false`
- **FR6.2**: MUST emit `sign_in_success` event on successful authentication
- **FR6.3**: MUST emit `passkey_used` event on successful authentication
- **FR6.4**: MUST emit `sign_in_error` event on failure when `conditional === false`
- **FR6.5**: MUST NOT emit UI events when `conditional === true`

### FR7: Token Management
- **FR7.1**: MUST call `scheduleTokenRefresh()` on successful authentication
- **FR7.2**: MUST use token expiration for refresh scheduling

### FR8: Analytics
- **FR8.1**: MUST report `webauthn-start` event when starting authentication
- **FR8.2**: MUST report `webauthn-success` event on successful authentication
- **FR8.3**: MUST report `webauthn-failure` event on failed authentication
- **FR8.4**: MUST include timing data in analytics events

### FR9: UI/UX Integration Requirements
- **FR9.1**: AuthSection MUST show "Open Demo" button when user is authenticated
- **FR9.2**: AuthSection MUST NOT automatically redirect authenticated users from landing page
- **FR9.3**: "Open Demo" button MUST navigate to `/app` when clicked
- **FR9.4**: Landing page "Open Button" MUST navigate to `/app` if user is authenticated
- **FR9.5**: Landing page "Open Button" MUST scroll to AuthSection if user is not authenticated
- **FR9.6**: Invitation flow (`?token=` present) MAY redirect to `/app` after successful authentication
- **FR9.7**: AuthSection MUST display user email in authenticated state
- **FR9.8**: AuthSection MUST provide clear visual distinction between authenticated/unauthenticated states

### FR10: Registration Email Verification Requirements
- **FR10.1**: RegistrationForm MUST check `emailVerifiedViaInvitation` field in registration response
- **FR10.2**: RegistrationForm MUST NOT show "Verify your email" message when `emailVerifiedViaInvitation` is true
- **FR10.3**: RegistrationForm MUST show "Your email has been verified" message when `emailVerifiedViaInvitation` is true
- **FR10.4**: RegistrationForm MUST show "Verify your email to unlock all features" message when `emailVerifiedViaInvitation` is false
- **FR10.5**: Registration API response MUST include `emailVerifiedViaInvitation` boolean field
- **FR10.6**: Registration API response MUST include `welcomeEmailSent` boolean field
- **FR10.7**: Registration API response MUST include `emailVerificationRequired` boolean field

## Non-Functional Requirements

### NFR1: Performance
- **NFR1.1**: MUST complete user lookup within 2 seconds
- **NFR1.2**: MUST complete challenge generation within 3 seconds
- **NFR1.3**: MUST complete server verification within 5 seconds
- **NFR1.4**: MUST complete session save within 100ms

### NFR2: Error Handling
- **NFR2.1**: MUST provide specific error messages for each failure type
- **NFR2.2**: MUST log detailed error information for debugging
- **NFR2.3**: MUST not expose sensitive information in error messages
- **NFR2.4**: MUST handle network timeouts gracefully

### NFR3: Security
- **NFR3.1**: MUST validate all API responses before processing
- **NFR3.2**: MUST not log sensitive credential data
- **NFR3.3**: MUST use secure credential serialization
- **NFR3.4**: MUST validate token format before storage

### NFR4: Compatibility
- **NFR4.1**: MUST work with both sessionStorage and localStorage
- **NFR4.2**: MUST handle both new and legacy API response formats
- **NFR4.3**: MUST work in conditional and non-conditional modes
- **NFR4.4**: MUST be compatible with existing session management

## Edge Cases

### EC1: Network Failures
- **EC1.1**: User lookup API call fails
- **EC1.2**: Challenge API call fails  
- **EC1.3**: Verification API call fails
- **EC1.4**: Intermittent network connectivity

### EC2: WebAuthn Failures
- **EC2.1**: User cancels WebAuthn prompt
- **EC2.2**: Biometric authentication fails
- **EC2.3**: No registered passkeys found
- **EC2.4**: WebAuthn not supported in browser

### EC3: Invalid Responses
- **EC3.1**: API returns malformed JSON
- **EC3.2**: API returns unexpected status codes
- **EC3.3**: Missing required fields in response
- **EC3.4**: Invalid token format in response

### EC4: Storage Failures
- **EC4.1**: Storage quota exceeded
- **EC4.2**: Storage disabled in browser
- **EC4.3**: Storage corruption/invalid data
- **EC4.4**: Concurrent storage access

### EC5: State Conflicts
- **EC5.1**: Multiple concurrent authentication attempts
- **EC5.2**: Authentication during existing session
- **EC5.3**: Storage configuration changes during auth
- **EC5.4**: Component unmount during authentication

## Success Criteria

### SC1: Happy Path
- **SC1.1**: User successfully authenticates with passkey
- **SC1.2**: Session is saved to correct storage
- **SC1.3**: Auth store state is updated correctly
- **SC1.4**: All required events are emitted
- **SC1.5**: Token refresh is scheduled

### SC2: Error Recovery
- **SC2.1**: Clear error messages for all failure types
- **SC2.2**: No partial state updates on failure
- **SC2.3**: No session data saved on failure
- **SC2.4**: Proper cleanup after errors

### SC3: Performance
- **SC3.1**: Total authentication time < 30 seconds
- **SC3.2**: UI remains responsive during authentication
- **SC3.3**: Memory usage remains stable
- **SC3.4**: No memory leaks after completion

## Test Categories

### Unit Tests
- Input validation
- Response format handling
- State updates
- Event emission
- Error conditions

### Integration Tests
- Full authentication flow
- Session management integration
- State machine integration
- Storage configuration variants

### Edge Case Tests
- Network failures
- WebAuthn failures
- Invalid responses
- Storage failures
- Concurrent operations

### Performance Tests
- Authentication timing
- Memory usage
- Concurrent user load
- Storage performance

### Security Tests
- Credential handling
- Token validation
- Error information leakage
- Session security

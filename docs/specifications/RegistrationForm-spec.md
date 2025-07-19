# RegistrationForm Component Specification

## Overview
The RegistrationForm component provides a complete user registration experience with WebAuthn passkey authentication in a single-form design. It supports invitation tokens, dynamic field configuration, and immediate app access after registration.

## Functional Requirements

### FR1: Component Props and Configuration
- **FR1.1**: MUST accept `config: AuthConfig` prop for authentication configuration
- **FR1.2**: MUST accept `showLogo: boolean` prop (default: true) for logo display
- **FR1.3**: MUST accept `compact: boolean` prop (default: false) for compact layout
- **FR1.4**: MUST accept `className: string` prop for custom styling
- **FR1.5**: MUST accept `initialEmail: string` prop for email prefilling
- **FR1.6**: MUST accept `invitationTokenData: InvitationTokenData | null` prop for invitation token support
- **FR1.6a**: MUST accept `invitationToken: string | null` prop for original JWT token string
- **FR1.7**: MUST accept `additionalFields: Array<'company' | 'phone' | 'jobTitle'>` prop for business fields
- **FR1.8**: MUST accept `readOnlyFields: string[]` prop for dynamic field locking
- **FR1.9**: MUST accept `onSwitchToSignIn: () => void` prop for mode switching

### FR2: Single-Form Registration Design
- **FR2.1**: MUST implement single-form layout with all fields visible at once
- **FR2.2**: MUST include Terms of Service and Privacy Policy checkboxes within the form
- **FR2.3**: MUST validate all required fields before allowing registration
- **FR2.4**: MUST support WebAuthn passkey creation directly from form submission
- **FR2.5**: MUST show immediate success state or app access after registration
- **FR2.6**: MUST NOT implement multi-step navigation or step transitions

### FR3: Field Management
- **FR3.1**: MUST support core fields: email, firstName, lastName
- **FR3.2**: MUST support business fields: company, phone, jobTitle when specified
- **FR3.3**: MUST implement dynamic read-only behavior based on `readOnlyFields` prop
- **FR3.4**: MUST prefill fields from `invitationTokenData` when provided
- **FR3.5**: MUST validate required fields before allowing step progression
- **FR3.6**: MUST implement email format validation with appropriate error messages
- **FR3.7**: MUST prevent email modification when provided via invitation token

### FR4: Invitation Token Integration
- **FR4.1**: MUST validate invitation token data format and expiration
- **FR4.2**: MUST display warning banner for expired invitation tokens
- **FR4.3**: MUST prefill form fields from invitation token data
- **FR4.4**: MUST enforce email matching between token and user input
- **FR4.5**: MUST mark email as verified when valid invitation token is provided
- **FR4.6**: MUST pass invitation token to registration API for backend validation

### FR5: Terms of Service and Privacy
- **FR5.1**: MUST require acceptance of Terms of Service checkbox
- **FR5.2**: MUST require acceptance of Privacy Policy checkbox
- **FR5.3**: MUST provide optional Marketing Consent checkbox
- **FR5.4**: MUST provide clickable links to terms and privacy policy documents
- **FR5.5**: MUST validate checkbox states before allowing registration
- **FR5.6**: MUST display appropriate error messages for validation failures

### FR6: WebAuthn Registration
- **FR6.1**: MUST check WebAuthn support before displaying registration button
- **FR6.2**: MUST check platform authenticator availability
- **FR6.3**: MUST call `authStore.createAccount()` with complete registration data
- **FR6.4**: MUST handle WebAuthn creation errors gracefully
- **FR6.5**: MUST display appropriate loading states during registration
- **FR6.6**: MUST provide helpful error messages for common WebAuthn failures

### FR7: Event Emission
- **FR7.1**: MUST emit `success` event on successful registration completion
- **FR7.2**: MUST emit `appAccess` event for immediate app access after registration
- **FR7.3**: MUST emit `error` event for registration failures
- **FR7.4**: MUST emit `switchToSignIn` event when user requests sign-in mode
- **FR7.5**: MUST NOT emit `stepChange` or `terms_accepted` events (removed with multi-step design)

### FR8: State Management
- **FR8.1**: MUST maintain form data state for all fields
- **FR8.2**: MUST maintain loading state for async operations
- **FR8.3**: MUST maintain error state for validation and API failures
- **FR8.4**: MUST reset state appropriately when form is reset

### FR9: Error Handling
- **FR9.1**: MUST display field validation errors inline
- **FR9.2**: MUST display API errors in appropriate locations
- **FR9.3**: MUST handle user already exists scenario
- **FR9.4**: MUST handle WebAuthn not supported scenario
- **FR9.5**: MUST handle invitation token expiration scenario
- **FR9.6**: MUST provide recovery options for error states

### FR10: Accessibility and UX
- **FR10.1**: MUST provide proper ARIA labels for all form elements
- **FR10.2**: MUST support keyboard navigation throughout the form
- **FR10.3**: MUST provide clear visual feedback for loading states
- **FR10.4**: MUST implement responsive design for mobile devices
- **FR10.5**: MUST provide clear success messaging after registration
- **FR10.6**: MUST follow established design patterns from flows-auth

## Technical Requirements

### TR1: Type Safety
- **TR1.1**: MUST use TypeScript interfaces for all props and data structures
- **TR1.2**: MUST define `InvitationTokenData` interface for invitation token support
- **TR1.3**: MUST extend `RegistrationRequest` interface for additional fields
- **TR1.4**: MUST provide proper type definitions for all event payloads

### TR2: Integration Requirements
- **TR2.1**: MUST integrate with existing `authStore` for registration operations
- **TR2.2**: MUST follow established error reporting patterns
- **TR2.3**: MUST support existing branding configuration system
- **TR2.4**: MUST be compatible with existing auth state machine

### TR3: Performance Requirements
- **TR3.1**: MUST lazy-load WebAuthn operations until needed
- **TR3.2**: MUST minimize component re-renders during form interaction
- **TR3.3**: MUST optimize bundle size impact on flows-auth library
- **TR3.4**: MUST provide efficient state management for large forms

## Testing Requirements

### TT1: Unit Testing
- **TT1.1**: MUST test component rendering with all prop combinations
- **TT1.2**: MUST test form validation logic for all field types
- **TT1.3**: MUST test event emission for all user interactions
- **TT1.4**: MUST test error handling for all failure scenarios
- **TT1.5**: MUST test invitation token integration scenarios

### TT2: Integration Testing
- **TT2.1**: MUST test complete registration flow with real API calls
- **TT2.2**: MUST test WebAuthn registration with virtual authenticator
- **TT2.3**: MUST test immediate app access after registration
- **TT2.4**: MUST test storage configuration updates after registration
- **TT2.5**: MUST test invitation token API integration

### TT3: Regression Testing
- **TT3.1**: MUST test auto-sign-in functionality after registration
- **TT3.2**: MUST test field prefilling with various token scenarios
- **TT3.3**: MUST test sign-in mode switching functionality
- **TT3.4**: MUST test form reset and state management
- **TT3.5**: MUST test error recovery scenarios

## API Interface

### Props Interface
```typescript
interface RegistrationFormProps {
  config: AuthConfig;
  showLogo?: boolean;
  compact?: boolean;
  className?: string;
  initialEmail?: string;
  invitationTokenData?: InvitationTokenData | null;
  invitationToken?: string | null; // Original JWT token string
  additionalFields?: Array<'company' | 'phone' | 'jobTitle'>;
  readOnlyFields?: string[];
  onSwitchToSignIn?: () => void;
}
```

### Event Interface
```typescript
interface RegistrationFormEvents {
  success: { user: User };
  appAccess: { user: User; emailVerifiedViaInvitation?: boolean; autoSignIn?: boolean };
  error: { error: AuthError };
  switchToSignIn: {};
}
```

### Data Interfaces
```typescript
interface InvitationTokenData {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  jobTitle?: string;
  expires?: Date;
  message?: string;
}

interface ExtendedRegistrationRequest extends RegistrationRequest {
  company?: string;
  phone?: string;
  jobTitle?: string;
}
```

## Behavioral Specifications

### BS1: Immediate App Access
- **BS1.1**: MUST emit `appAccess` event immediately after successful registration
- **BS1.2**: MUST NOT show blocking success screens that prevent app access
- **BS1.3**: MUST follow documented state machine behavior for `authenticated-unconfirmed` state
- **BS1.4**: MUST provide immediate access to app functionality per documentation

### BS2: Invitation Token Behavior
- **BS2.1**: MUST validate token expiration and show appropriate warnings
- **BS2.2**: MUST prefill all available fields from token data
- **BS2.3**: MUST lock email field when provided via token
- **BS2.4**: MUST validate email matching between token and user input
- **BS2.5**: MUST handle token validation errors gracefully

### BS3: Dynamic Field Configuration
- **BS3.1**: MUST show only requested additional fields
- **BS3.2**: MUST mark fields as required or optional based on configuration
- **BS3.3**: MUST apply read-only state to specified fields
- **BS3.4**: MUST maintain form validity based on current field configuration

## Compatibility Requirements

### CR1: Backward Compatibility
- **CR1.1**: MUST maintain existing RegistrationForm API for basic use cases
- **CR1.2**: MUST provide default values for new optional props
- **CR1.3**: MUST emit both new and existing events for compatibility
- **CR1.4**: MUST support existing branding and styling configurations

### CR2: Integration Compatibility
- **CR2.1**: MUST work with existing flows-auth authentication system
- **CR2.2**: MUST integrate with existing error reporting mechanisms
- **CR2.3**: MUST support existing storage configuration patterns
- **CR2.4**: MUST maintain compatibility with existing auth state machine

## Success Criteria

### SC1: Feature Completeness
- **SC1.1**: All flows.thepia.net registration functionality preserved
- **SC1.2**: Enhanced capabilities for invitation token handling
- **SC1.3**: Proper auto-sign-in behavior after registration
- **SC1.4**: Complete event system for integration flexibility

### SC2: Quality Assurance
- **SC2.1**: 90%+ test coverage for component functionality
- **SC2.2**: Zero regressions when replacing existing implementations
- **SC2.3**: Comprehensive documentation with examples
- **SC2.4**: Performance impact minimal on library bundle size

### SC3: Developer Experience
- **SC3.1**: Clear TypeScript interfaces for all configurations
- **SC3.2**: Helpful error messages for common misconfigurations
- **SC3.3**: Comprehensive examples for all use cases
- **SC3.4**: Integration guide for migration from custom implementations
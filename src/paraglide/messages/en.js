/* eslint-disable */


export const email_label = /** @type {(inputs: {}) => string} */ () => {
	return `Email address`
};

export const email_placeholder = /** @type {(inputs: {}) => string} */ () => {
	return `your@email.com`
};

export const email_invalid = /** @type {(inputs: {}) => string} */ () => {
	return `Please enter a valid email address`
};

export const email_required = /** @type {(inputs: {}) => string} */ () => {
	return `Email address is required`
};

export const form_signintitle2 = /** @type {(inputs: { companyName: NonNullable<unknown> }) => string} */ (i) => {
	return `Sign in to ${i.companyName}`
};

export const form_signindescription2 = /** @type {(inputs: { companyName: NonNullable<unknown> }) => string} */ (i) => {
	return `Use your ${i.companyName} account, or create one.`
};

export const form_signingeneric2 = /** @type {(inputs: {}) => string} */ () => {
	return `Sign in`
};

export const form_signingenericdescription3 = /** @type {(inputs: { companyName: NonNullable<unknown> }) => string} */ (i) => {
	return `Enter your email to continue to ${i.companyName}`
};

export const auth_signin1 = /** @type {(inputs: {}) => string} */ () => {
	return `Sign In`
};

export const auth_signinwithpasskey3 = /** @type {(inputs: {}) => string} */ () => {
	return `Sign in with Passkey`
};

export const auth_continuewithtouchid3 = /** @type {(inputs: {}) => string} */ () => {
	return `Continue with Touch ID`
};

export const auth_continuewithfaceid3 = /** @type {(inputs: {}) => string} */ () => {
	return `Continue with Face ID`
};

export const auth_continuewithbiometric2 = /** @type {(inputs: {}) => string} */ () => {
	return `Continue with Touch ID/Face ID`
};

export const auth_continuewithtouchidfaceid5 = /** @type {(inputs: {}) => string} */ () => {
	return `Continue with Touch ID/Face ID`
};

export const auth_sendpinbyemail3 = /** @type {(inputs: {}) => string} */ () => {
	return `Send pin by email`
};

export const auth_sendpintoemail3 = /** @type {(inputs: {}) => string} */ () => {
	return `Send pin to email`
};

export const auth_sendmagiclink2 = /** @type {(inputs: {}) => string} */ () => {
	return `Send Magic Link`
};

export const auth_loading = /** @type {(inputs: {}) => string} */ () => {
	return `Loading...`
};

export const auth_signingin1 = /** @type {(inputs: {}) => string} */ () => {
	return `Signing in...`
};

export const auth_sendingpin1 = /** @type {(inputs: {}) => string} */ () => {
	return `Sending pin...`
};

export const auth_sendingmagiclink2 = /** @type {(inputs: {}) => string} */ () => {
	return `Sending magic link...`
};

export const auth_authenticating = /** @type {(inputs: {}) => string} */ () => {
	return `Authenticating...`
};

export const code_label = /** @type {(inputs: {}) => string} */ () => {
	return `Enter verification code`
};

export const code_placeholder = /** @type {(inputs: {}) => string} */ () => {
	return `6-digit code`
};

export const code_invalid = /** @type {(inputs: {}) => string} */ () => {
	return `Please enter a valid 6-digit code`
};

export const code_expired = /** @type {(inputs: {}) => string} */ () => {
	return `Verification code has expired`
};

export const code_incorrect = /** @type {(inputs: {}) => string} */ () => {
	return `Incorrect verification code`
};

export const code_verify = /** @type {(inputs: {}) => string} */ () => {
	return `Verify Code`
};

export const code_verifying = /** @type {(inputs: {}) => string} */ () => {
	return `Verifying...`
};

export const error_invalidcode1 = /** @type {(inputs: {}) => string} */ () => {
	return `Invalid or expired code. Perhaps you have a newer code.`
};

export const status_emailsent1 = /** @type {(inputs: {}) => string} */ () => {
	return `We sent a verification code by email`
};

export const status_checkemail1 = /** @type {(inputs: {}) => string} */ () => {
	return `Check your email`
};

export const status_pinvalid1 = /** @type {(inputs: { minutes: NonNullable<unknown>, s: NonNullable<unknown> }) => string} */ (i) => {
	return `A valid pin was already sent to you, good for ${i.minutes} minute${i.s}.`
};

export const status_pindirectaction2 = /** @type {(inputs: {}) => string} */ () => {
	return `Enter pin here`
};

export const status_pindetected1 = /** @type {(inputs: {}) => string} */ () => {
	return `Valid pin detected`
};

export const status_signinsuccess2 = /** @type {(inputs: {}) => string} */ () => {
	return `Welcome back!`
};

export const status_magiclinksent2 = /** @type {(inputs: {}) => string} */ () => {
	return `We sent a secure login link to`
};

export const error_network = /** @type {(inputs: {}) => string} */ () => {
	return `Networking error.`
};

export const error_usernotfound2 = /** @type {(inputs: {}) => string} */ () => {
	return `No account found with this email address`
};

export const error_invalidcredentials1 = /** @type {(inputs: {}) => string} */ () => {
	return `Invalid email or authentication failed`
};

export const error_serviceunavailable1 = /** @type {(inputs: {}) => string} */ () => {
	return `Service temporarily unavailable.`
};

export const error_unknown = /** @type {(inputs: {}) => string} */ () => {
	return `An unexpected error occurred`
};

export const error_ratelimited1 = /** @type {(inputs: {}) => string} */ () => {
	return `Too many attempts.`
};

export const error_invalidinput1 = /** @type {(inputs: {}) => string} */ () => {
	return `Invalid input.`
};

export const error_authcancelled1 = /** @type {(inputs: {}) => string} */ () => {
	return `Authentication was cancelled.`
};

export const error_authfailed1 = /** @type {(inputs: {}) => string} */ () => {
	return `Authentication failed.`
};

export const error_magiclinkfailed2 = /** @type {(inputs: {}) => string} */ () => {
	return `Failed to send magic link.`
};

export const error_noauthmethods2 = /** @type {(inputs: {}) => string} */ () => {
	return `No authentication methods available for this email.`
};

export const error_nopasskeyfound2 = /** @type {(inputs: {}) => string} */ () => {
	return `No passkey found for this email.`
};

export const error_passkeynotsupported2 = /** @type {(inputs: {}) => string} */ () => {
	return `Passkey authentication is not supported on this device.`
};

export const error_securityerror1 = /** @type {(inputs: {}) => string} */ () => {
	return `Security error occurred.`
};

export const error_nopasskeyavailable2 = /** @type {(inputs: {}) => string} */ () => {
	return `No passkey available on this device.`
};

export const error_registrationfailed1 = /** @type {(inputs: {}) => string} */ () => {
	return `Registration failed`
};

export const error_unknownerror1 = /** @type {(inputs: {}) => string} */ () => {
	return `An unexpected error occurred.`
};

export const auth_onlyregisteredusers2 = /** @type {(inputs: {}) => string} */ () => {
	return `Only registered users can sign in. Please contact support if you need access.`
};

export const auth_fullname1 = /** @type {(inputs: {}) => string} */ () => {
	return `Full Name`
};

export const auth_fullnameplaceholder2 = /** @type {(inputs: {}) => string} */ () => {
	return `Enter your full name`
};

export const auth_newusertermsnotice3 = /** @type {(inputs: {}) => string} */ () => {
	return `As a new user you will have to review and confirm the terms of service after signing-in via e-mail.`
};

export const auth_signedinsuccess2 = /** @type {(inputs: {}) => string} */ () => {
	return `Successfully signed in!`
};

export const webauthn_ready = /** @type {(inputs: {}) => string} */ () => {
	return `🔐 WebAuthn ready - Touch ID/Face ID will appear automatically`
};

export const webauthn_touchid1 = /** @type {(inputs: {}) => string} */ () => {
	return `Touch ID`
};

export const webauthn_faceid1 = /** @type {(inputs: {}) => string} */ () => {
	return `Face ID`
};

export const webauthn_cancelled = /** @type {(inputs: {}) => string} */ () => {
	return `Authentication was cancelled`
};

export const webauthn_notsupported1 = /** @type {(inputs: {}) => string} */ () => {
	return `WebAuthn is not supported on this device`
};

export const security_passwordlessexplanation1 = /** @type {(inputs: { companyName: NonNullable<unknown> }) => string} */ (i) => {
	return `${i.companyName} uses passwordless authentication with biometric passkeys or secure email links for enhanced security and convenience.`
};

export const security_passwordlessgeneric1 = /** @type {(inputs: {}) => string} */ () => {
	return `Passwordless authentication with biometric passkeys or secure email links for enhanced security and convenience.`
};

export const security_passwordlesswithpin2 = /** @type {(inputs: { companyName: NonNullable<unknown> }) => string} */ (i) => {
	return `${i.companyName} uses passwordless authentication with biometric passkeys or secure email pins for enhanced security and convenience.`
};

export const security_passwordlesswithpingeneric3 = /** @type {(inputs: {}) => string} */ () => {
	return `Passwordless authentication with biometric passkeys or secure email pins for enhanced security and convenience.`
};

export const explainer_features_securepasskey1 = /** @type {(inputs: {}) => string} */ () => {
	return `Secure passkey authentication`
};

export const explainer_features_privacycompliant1 = /** @type {(inputs: {}) => string} */ () => {
	return `Privacy-compliant access`
};

export const explainer_features_employeeverification1 = /** @type {(inputs: {}) => string} */ () => {
	return `Employee verification required`
};

export const explainer_features_userverification1 = /** @type {(inputs: {}) => string} */ () => {
	return `User verification required`
};

export const action_retry = /** @type {(inputs: {}) => string} */ () => {
	return `Try again`
};

export const action_back = /** @type {(inputs: {}) => string} */ () => {
	return `Back`
};

export const action_continue = /** @type {(inputs: {}) => string} */ () => {
	return `Continue`
};

export const action_cancel = /** @type {(inputs: {}) => string} */ () => {
	return `Cancel`
};

export const action_usedifferentemail2 = /** @type {(inputs: {}) => string} */ () => {
	return `Use a different email`
};

export const signin_title1 = /** @type {(inputs: {}) => string} */ () => {
	return `Sign in`
};

export const signin_subtitle1 = /** @type {(inputs: { companyName: NonNullable<unknown> }) => string} */ (i) => {
	return `Enter your email to continue to ${i.companyName}`
};

export const signin_subtitlegeneric2 = /** @type {(inputs: {}) => string} */ () => {
	return `Enter your email to continue to your account`
};

export const signin_webauthnindicator3 = /** @type {(inputs: {}) => string} */ () => {
	return `🔐 WebAuthn ready - Touch ID/Face ID will appear automatically`
};

export const magiclink_title1 = /** @type {(inputs: {}) => string} */ () => {
	return `Check your email`
};

export const magiclink_description1 = /** @type {(inputs: {}) => string} */ () => {
	return `We sent a secure login link to`
};

export const magiclink_differentemail2 = /** @type {(inputs: {}) => string} */ () => {
	return `Use a different email`
};

export const registration_termstitle1 = /** @type {(inputs: {}) => string} */ () => {
	return `Terms & Privacy`
};

export const registration_termsdescription1 = /** @type {(inputs: {}) => string} */ () => {
	return `Please review and accept our terms to create your account`
};

export const registration_agreeterms1 = /** @type {(inputs: {}) => string} */ () => {
	return `I agree to the`
};

export const registration_agreeprivacy1 = /** @type {(inputs: {}) => string} */ () => {
	return `I agree to the`
};

export const registration_termslink1 = /** @type {(inputs: {}) => string} */ () => {
	return `Terms of Service`
};

export const registration_privacylink1 = /** @type {(inputs: {}) => string} */ () => {
	return `Privacy Policy`
};

export const registration_createaccount1 = /** @type {(inputs: {}) => string} */ () => {
	return `Create Account`
};

export const registration_creatingaccount1 = /** @type {(inputs: {}) => string} */ () => {
	return `Creating Account...`
};

export const registration_webauthninfo2 = /** @type {(inputs: {}) => string} */ () => {
	return `🔐 Your device will prompt for Touch ID, Face ID, or Windows Hello`
};

export const registration_successtitle1 = /** @type {(inputs: {}) => string} */ () => {
	return `Account Created Successfully!`
};

export const registration_successdescription1 = /** @type {(inputs: { companyName: NonNullable<unknown> }) => string} */ (i) => {
	return `Welcome to ${i.companyName}!`
};

export const registration_successdescriptiongeneric2 = /** @type {(inputs: {}) => string} */ () => {
	return `Welcome to our platform!`
};

export const registration_successexplore1 = /** @type {(inputs: {}) => string} */ () => {
	return `You can now explore the application.`
};

export const registration_welcomeemail1 = /** @type {(inputs: {}) => string} */ () => {
	return `📧 We've sent a welcome email to`
};

export const registration_verifyemail1 = /** @type {(inputs: {}) => string} */ () => {
	return `🔓 Verify your email to unlock all features`
};

export const registration_required = /** @type {(inputs: {}) => string} */ () => {
	return `Registration is required. Please complete the registration process.`
};

export const terms_acceptrequired1 = /** @type {(inputs: {}) => string} */ () => {
	return `You must accept the Terms of Service and Privacy Policy to continue.`
};

export const privacy_acceptrequired1 = /** @type {(inputs: {}) => string} */ () => {
	return `You must accept the privacy policy`
};

export const registration_terms = /** @type {(inputs: { companyName: NonNullable<unknown> }) => string} */ (i) => {
	return `I accept the ${i.companyName} Terms of Service`
};

export const registration_privacy = /** @type {(inputs: { companyName: NonNullable<unknown> }) => string} */ (i) => {
	return `I accept the ${i.companyName} Privacy Policy`
};

export const registration_completing = /** @type {(inputs: {}) => string} */ () => {
	return `Completing registration...`
};

export const registration_termsservicerequired2 = /** @type {(inputs: {}) => string} */ () => {
	return `Terms of Service must be accepted`
};

export const branding_securedby1 = /** @type {(inputs: {}) => string} */ () => {
	return `Secured by`
};

export const branding_poweredby1 = /** @type {(inputs: {}) => string} */ () => {
	return `Thepia`
};

export const time_minute = /** @type {(inputs: {}) => string} */ () => {
	return `minute`
};

export const time_minutes = /** @type {(inputs: {}) => string} */ () => {
	return `minutes`
};

export const time_second = /** @type {(inputs: {}) => string} */ () => {
	return `second`
};

export const time_seconds = /** @type {(inputs: {}) => string} */ () => {
	return `seconds`
};

export const user_welcomeback1 = /** @type {(inputs: {}) => string} */ () => {
	return `Welcome back!`
};

export const user_signout1 = /** @type {(inputs: {}) => string} */ () => {
	return `Sign out`
};

export const user_security_title = /** @type {(inputs: {}) => string} */ () => {
	return `Security`
};

export const user_security_description = /** @type {(inputs: {}) => string} */ () => {
	return `Manage your passkeys, authentication methods, and security settings.`
};

export const user_security_managepasskeys1 = /** @type {(inputs: {}) => string} */ () => {
	return `Manage Passkeys`
};

export const user_profile_title = /** @type {(inputs: {}) => string} */ () => {
	return `Profile`
};

export const user_profile_description = /** @type {(inputs: {}) => string} */ () => {
	return `Update your personal information and account preferences.`
};

export const user_profile_editprofile1 = /** @type {(inputs: {}) => string} */ () => {
	return `Edit Profile`
};

export const user_privacy_title = /** @type {(inputs: {}) => string} */ () => {
	return `Privacy & Legal`
};

export const user_privacy_description = /** @type {(inputs: {}) => string} */ () => {
	return `Review data policies, terms of service, and privacy settings.`
};

export const user_privacy_datapolicy1 = /** @type {(inputs: {}) => string} */ () => {
	return `Data Policy`
};

export const user_privacy_termsofservice2 = /** @type {(inputs: {}) => string} */ () => {
	return `Terms of Service`
};
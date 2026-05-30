/* eslint-disable */
import { getLocale, experimentalStaticLocale } from "../runtime.js"

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Email_LabelInputs */
/** @typedef {{}} Email_PlaceholderInputs */
/** @typedef {{}} Email_InvalidInputs */
/** @typedef {{}} Email_RequiredInputs */
/** @typedef {{ companyName: NonNullable<unknown> }} Form_Signintitle2Inputs */
/** @typedef {{ companyName: NonNullable<unknown> }} Form_Signindescription2Inputs */
/** @typedef {{}} Form_Signingeneric2Inputs */
/** @typedef {{ companyName: NonNullable<unknown> }} Form_Signingenericdescription3Inputs */
/** @typedef {{}} Auth_Signin1Inputs */
/** @typedef {{}} Auth_Signinwithpasskey3Inputs */
/** @typedef {{}} Auth_Continuewithtouchid3Inputs */
/** @typedef {{}} Auth_Continuewithfaceid3Inputs */
/** @typedef {{}} Auth_Continuewithbiometric2Inputs */
/** @typedef {{}} Auth_Continuewithtouchidfaceid5Inputs */
/** @typedef {{}} Auth_Sendpinbyemail3Inputs */
/** @typedef {{}} Auth_Sendpintoemail3Inputs */
/** @typedef {{}} Auth_Sendmagiclink2Inputs */
/** @typedef {{}} Auth_LoadingInputs */
/** @typedef {{}} Auth_Signingin1Inputs */
/** @typedef {{}} Auth_Sendingpin1Inputs */
/** @typedef {{}} Auth_Sendingmagiclink2Inputs */
/** @typedef {{}} Auth_AuthenticatingInputs */
/** @typedef {{}} Code_LabelInputs */
/** @typedef {{}} Code_PlaceholderInputs */
/** @typedef {{}} Code_InvalidInputs */
/** @typedef {{}} Code_ExpiredInputs */
/** @typedef {{}} Code_IncorrectInputs */
/** @typedef {{}} Code_VerifyInputs */
/** @typedef {{}} Code_VerifyingInputs */
/** @typedef {{}} Error_Invalidcode1Inputs */
/** @typedef {{}} Status_Emailsent1Inputs */
/** @typedef {{}} Status_Checkemail1Inputs */
/** @typedef {{ minutes: NonNullable<unknown>, s: NonNullable<unknown> }} Status_Pinvalid1Inputs */
/** @typedef {{}} Status_Pindirectaction2Inputs */
/** @typedef {{}} Status_Pindetected1Inputs */
/** @typedef {{}} Status_Signinsuccess2Inputs */
/** @typedef {{}} Status_Magiclinksent2Inputs */
/** @typedef {{}} Error_NetworkInputs */
/** @typedef {{}} Error_Usernotfound2Inputs */
/** @typedef {{}} Error_Invalidcredentials1Inputs */
/** @typedef {{}} Error_Serviceunavailable1Inputs */
/** @typedef {{}} Error_UnknownInputs */
/** @typedef {{}} Error_Ratelimited1Inputs */
/** @typedef {{}} Error_Invalidinput1Inputs */
/** @typedef {{}} Error_Authcancelled1Inputs */
/** @typedef {{}} Error_Authfailed1Inputs */
/** @typedef {{}} Error_Magiclinkfailed2Inputs */
/** @typedef {{}} Error_Noauthmethods2Inputs */
/** @typedef {{}} Error_Nopasskeyfound2Inputs */
/** @typedef {{}} Error_Passkeynotsupported2Inputs */
/** @typedef {{}} Error_Securityerror1Inputs */
/** @typedef {{}} Error_Nopasskeyavailable2Inputs */
/** @typedef {{}} Error_Registrationfailed1Inputs */
/** @typedef {{}} Error_Unknownerror1Inputs */
/** @typedef {{}} Auth_Onlyregisteredusers2Inputs */
/** @typedef {{}} Auth_Fullname1Inputs */
/** @typedef {{}} Auth_Fullnameplaceholder2Inputs */
/** @typedef {{}} Auth_Newusertermsnotice3Inputs */
/** @typedef {{}} Auth_Signedinsuccess2Inputs */
/** @typedef {{}} Webauthn_ReadyInputs */
/** @typedef {{}} Webauthn_Touchid1Inputs */
/** @typedef {{}} Webauthn_Faceid1Inputs */
/** @typedef {{}} Webauthn_CancelledInputs */
/** @typedef {{}} Webauthn_Notsupported1Inputs */
/** @typedef {{ companyName: NonNullable<unknown> }} Security_Passwordlessexplanation1Inputs */
/** @typedef {{}} Security_Passwordlessgeneric1Inputs */
/** @typedef {{ companyName: NonNullable<unknown> }} Security_Passwordlesswithpin2Inputs */
/** @typedef {{}} Security_Passwordlesswithpingeneric3Inputs */
/** @typedef {{}} Explainer_Features_Securepasskey1Inputs */
/** @typedef {{}} Explainer_Features_Privacycompliant1Inputs */
/** @typedef {{}} Explainer_Features_Employeeverification1Inputs */
/** @typedef {{}} Explainer_Features_Userverification1Inputs */
/** @typedef {{}} Explainer_Features_Seepolicies1Inputs */
/** @typedef {{}} Action_RetryInputs */
/** @typedef {{}} Action_BackInputs */
/** @typedef {{}} Action_ContinueInputs */
/** @typedef {{}} Action_CancelInputs */
/** @typedef {{}} Action_Usedifferentemail2Inputs */
/** @typedef {{}} Signin_Title1Inputs */
/** @typedef {{ companyName: NonNullable<unknown> }} Signin_Subtitle1Inputs */
/** @typedef {{}} Signin_Subtitlegeneric2Inputs */
/** @typedef {{}} Signin_Webauthnindicator3Inputs */
/** @typedef {{}} Magiclink_Title1Inputs */
/** @typedef {{}} Magiclink_Description1Inputs */
/** @typedef {{}} Magiclink_Differentemail2Inputs */
/** @typedef {{}} Registration_Termstitle1Inputs */
/** @typedef {{}} Registration_Termsdescription1Inputs */
/** @typedef {{}} Registration_Agreeterms1Inputs */
/** @typedef {{}} Registration_Agreeprivacy1Inputs */
/** @typedef {{}} Registration_Termslink1Inputs */
/** @typedef {{}} Registration_Privacylink1Inputs */
/** @typedef {{}} Registration_Createaccount1Inputs */
/** @typedef {{}} Registration_Creatingaccount1Inputs */
/** @typedef {{}} Registration_Webauthninfo2Inputs */
/** @typedef {{}} Registration_Successtitle1Inputs */
/** @typedef {{ companyName: NonNullable<unknown> }} Registration_Successdescription1Inputs */
/** @typedef {{}} Registration_Successdescriptiongeneric2Inputs */
/** @typedef {{}} Registration_Successexplore1Inputs */
/** @typedef {{}} Registration_Welcomeemail1Inputs */
/** @typedef {{}} Registration_Verifyemail1Inputs */
/** @typedef {{}} Registration_RequiredInputs */
/** @typedef {{}} Terms_Acceptrequired1Inputs */
/** @typedef {{}} Privacy_Acceptrequired1Inputs */
/** @typedef {{ companyName: NonNullable<unknown> }} Registration_TermsInputs */
/** @typedef {{ companyName: NonNullable<unknown> }} Registration_PrivacyInputs */
/** @typedef {{}} Registration_CompletingInputs */
/** @typedef {{}} Registration_Termsservicerequired2Inputs */
/** @typedef {{}} Branding_Securedby1Inputs */
/** @typedef {{}} Branding_Poweredby1Inputs */
/** @typedef {{}} Time_MinuteInputs */
/** @typedef {{}} Time_MinutesInputs */
/** @typedef {{}} Time_SecondInputs */
/** @typedef {{}} Time_SecondsInputs */
/** @typedef {{}} User_Welcomeback1Inputs */
/** @typedef {{}} User_Signout1Inputs */
/** @typedef {{}} User_Security_TitleInputs */
/** @typedef {{}} User_Security_DescriptionInputs */
/** @typedef {{}} User_Security_Managepasskeys1Inputs */
/** @typedef {{}} User_Profile_TitleInputs */
/** @typedef {{}} User_Profile_DescriptionInputs */
/** @typedef {{}} User_Profile_Editprofile1Inputs */
/** @typedef {{}} User_Privacy_TitleInputs */
/** @typedef {{}} User_Privacy_DescriptionInputs */
/** @typedef {{}} User_Privacy_Datapolicy1Inputs */
/** @typedef {{}} User_Privacy_Termsofservice2Inputs */
import * as __en from "./en.js"
import * as __da from "./da.js"
/**
* | output |
* | --- |
* | "Email address" |
*
* @param {Email_LabelInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const email_label = /** @type {((inputs?: Email_LabelInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Email_LabelInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.email_label(inputs)
	return __da.email_label(inputs)
});
export { email_label as "email.label" }
/**
* | output |
* | --- |
* | "your@email.com" |
*
* @param {Email_PlaceholderInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const email_placeholder = /** @type {((inputs?: Email_PlaceholderInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Email_PlaceholderInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.email_placeholder(inputs)
	return __da.email_placeholder(inputs)
});
export { email_placeholder as "email.placeholder" }
/**
* | output |
* | --- |
* | "Please enter a valid email address" |
*
* @param {Email_InvalidInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const email_invalid = /** @type {((inputs?: Email_InvalidInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Email_InvalidInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.email_invalid(inputs)
	return __da.email_invalid(inputs)
});
export { email_invalid as "email.invalid" }
/**
* | output |
* | --- |
* | "Email address is required" |
*
* @param {Email_RequiredInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const email_required = /** @type {((inputs?: Email_RequiredInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Email_RequiredInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.email_required(inputs)
	return __da.email_required(inputs)
});
export { email_required as "email.required" }
/**
* | output |
* | --- |
* | "Sign in to {companyName}" |
*
* @param {Form_Signintitle2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const form_signintitle2 = /** @type {((inputs: Form_Signintitle2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Form_Signintitle2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.form_signintitle2(inputs)
	return __da.form_signintitle2(inputs)
});
export { form_signintitle2 as "form.signInTitle" }
/**
* | output |
* | --- |
* | "Use your {companyName} account, or create one." |
*
* @param {Form_Signindescription2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const form_signindescription2 = /** @type {((inputs: Form_Signindescription2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Form_Signindescription2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.form_signindescription2(inputs)
	return __da.form_signindescription2(inputs)
});
export { form_signindescription2 as "form.signInDescription" }
/**
* | output |
* | --- |
* | "Sign in" |
*
* @param {Form_Signingeneric2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const form_signingeneric2 = /** @type {((inputs?: Form_Signingeneric2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Form_Signingeneric2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.form_signingeneric2(inputs)
	return __da.form_signingeneric2(inputs)
});
export { form_signingeneric2 as "form.signInGeneric" }
/**
* | output |
* | --- |
* | "Enter your email to continue to {companyName}" |
*
* @param {Form_Signingenericdescription3Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const form_signingenericdescription3 = /** @type {((inputs: Form_Signingenericdescription3Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Form_Signingenericdescription3Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.form_signingenericdescription3(inputs)
	return __da.form_signingenericdescription3(inputs)
});
export { form_signingenericdescription3 as "form.signInGenericDescription" }
/**
* | output |
* | --- |
* | "Sign In" |
*
* @param {Auth_Signin1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const auth_signin1 = /** @type {((inputs?: Auth_Signin1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Auth_Signin1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.auth_signin1(inputs)
	return __da.auth_signin1(inputs)
});
export { auth_signin1 as "auth.signIn" }
/**
* | output |
* | --- |
* | "Sign in with Passkey" |
*
* @param {Auth_Signinwithpasskey3Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const auth_signinwithpasskey3 = /** @type {((inputs?: Auth_Signinwithpasskey3Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Auth_Signinwithpasskey3Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.auth_signinwithpasskey3(inputs)
	return __da.auth_signinwithpasskey3(inputs)
});
export { auth_signinwithpasskey3 as "auth.signInWithPasskey" }
/**
* | output |
* | --- |
* | "Continue with Touch ID" |
*
* @param {Auth_Continuewithtouchid3Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const auth_continuewithtouchid3 = /** @type {((inputs?: Auth_Continuewithtouchid3Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Auth_Continuewithtouchid3Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.auth_continuewithtouchid3(inputs)
	return __da.auth_continuewithtouchid3(inputs)
});
export { auth_continuewithtouchid3 as "auth.continueWithTouchId" }
/**
* | output |
* | --- |
* | "Continue with Face ID" |
*
* @param {Auth_Continuewithfaceid3Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const auth_continuewithfaceid3 = /** @type {((inputs?: Auth_Continuewithfaceid3Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Auth_Continuewithfaceid3Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.auth_continuewithfaceid3(inputs)
	return __da.auth_continuewithfaceid3(inputs)
});
export { auth_continuewithfaceid3 as "auth.continueWithFaceId" }
/**
* | output |
* | --- |
* | "Continue with Touch ID/Face ID" |
*
* @param {Auth_Continuewithbiometric2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const auth_continuewithbiometric2 = /** @type {((inputs?: Auth_Continuewithbiometric2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Auth_Continuewithbiometric2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.auth_continuewithbiometric2(inputs)
	return __da.auth_continuewithbiometric2(inputs)
});
export { auth_continuewithbiometric2 as "auth.continueWithBiometric" }
/**
* | output |
* | --- |
* | "Continue with Touch ID/Face ID" |
*
* @param {Auth_Continuewithtouchidfaceid5Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const auth_continuewithtouchidfaceid5 = /** @type {((inputs?: Auth_Continuewithtouchidfaceid5Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Auth_Continuewithtouchidfaceid5Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.auth_continuewithtouchidfaceid5(inputs)
	return __da.auth_continuewithtouchidfaceid5(inputs)
});
export { auth_continuewithtouchidfaceid5 as "auth.continueWithTouchIdFaceId" }
/**
* | output |
* | --- |
* | "Send pin by email" |
*
* @param {Auth_Sendpinbyemail3Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const auth_sendpinbyemail3 = /** @type {((inputs?: Auth_Sendpinbyemail3Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Auth_Sendpinbyemail3Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.auth_sendpinbyemail3(inputs)
	return __da.auth_sendpinbyemail3(inputs)
});
export { auth_sendpinbyemail3 as "auth.sendPinByEmail" }
/**
* | output |
* | --- |
* | "Send pin to email" |
*
* @param {Auth_Sendpintoemail3Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const auth_sendpintoemail3 = /** @type {((inputs?: Auth_Sendpintoemail3Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Auth_Sendpintoemail3Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.auth_sendpintoemail3(inputs)
	return __da.auth_sendpintoemail3(inputs)
});
export { auth_sendpintoemail3 as "auth.sendPinToEmail" }
/**
* | output |
* | --- |
* | "Send Magic Link" |
*
* @param {Auth_Sendmagiclink2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const auth_sendmagiclink2 = /** @type {((inputs?: Auth_Sendmagiclink2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Auth_Sendmagiclink2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.auth_sendmagiclink2(inputs)
	return __da.auth_sendmagiclink2(inputs)
});
export { auth_sendmagiclink2 as "auth.sendMagicLink" }
/**
* | output |
* | --- |
* | "Loading..." |
*
* @param {Auth_LoadingInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const auth_loading = /** @type {((inputs?: Auth_LoadingInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Auth_LoadingInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.auth_loading(inputs)
	return __da.auth_loading(inputs)
});
export { auth_loading as "auth.loading" }
/**
* | output |
* | --- |
* | "Signing in..." |
*
* @param {Auth_Signingin1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const auth_signingin1 = /** @type {((inputs?: Auth_Signingin1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Auth_Signingin1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.auth_signingin1(inputs)
	return __da.auth_signingin1(inputs)
});
export { auth_signingin1 as "auth.signingIn" }
/**
* | output |
* | --- |
* | "Sending pin..." |
*
* @param {Auth_Sendingpin1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const auth_sendingpin1 = /** @type {((inputs?: Auth_Sendingpin1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Auth_Sendingpin1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.auth_sendingpin1(inputs)
	return __da.auth_sendingpin1(inputs)
});
export { auth_sendingpin1 as "auth.sendingPin" }
/**
* | output |
* | --- |
* | "Sending magic link..." |
*
* @param {Auth_Sendingmagiclink2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const auth_sendingmagiclink2 = /** @type {((inputs?: Auth_Sendingmagiclink2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Auth_Sendingmagiclink2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.auth_sendingmagiclink2(inputs)
	return __da.auth_sendingmagiclink2(inputs)
});
export { auth_sendingmagiclink2 as "auth.sendingMagicLink" }
/**
* | output |
* | --- |
* | "Authenticating..." |
*
* @param {Auth_AuthenticatingInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const auth_authenticating = /** @type {((inputs?: Auth_AuthenticatingInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Auth_AuthenticatingInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.auth_authenticating(inputs)
	return __da.auth_authenticating(inputs)
});
export { auth_authenticating as "auth.authenticating" }
/**
* | output |
* | --- |
* | "Enter verification code" |
*
* @param {Code_LabelInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const code_label = /** @type {((inputs?: Code_LabelInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Code_LabelInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.code_label(inputs)
	return __da.code_label(inputs)
});
export { code_label as "code.label" }
/**
* | output |
* | --- |
* | "6-digit code" |
*
* @param {Code_PlaceholderInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const code_placeholder = /** @type {((inputs?: Code_PlaceholderInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Code_PlaceholderInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.code_placeholder(inputs)
	return __da.code_placeholder(inputs)
});
export { code_placeholder as "code.placeholder" }
/**
* | output |
* | --- |
* | "Please enter a valid 6-digit code" |
*
* @param {Code_InvalidInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const code_invalid = /** @type {((inputs?: Code_InvalidInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Code_InvalidInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.code_invalid(inputs)
	return __da.code_invalid(inputs)
});
export { code_invalid as "code.invalid" }
/**
* | output |
* | --- |
* | "Verification code has expired" |
*
* @param {Code_ExpiredInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const code_expired = /** @type {((inputs?: Code_ExpiredInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Code_ExpiredInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.code_expired(inputs)
	return __da.code_expired(inputs)
});
export { code_expired as "code.expired" }
/**
* | output |
* | --- |
* | "Incorrect verification code" |
*
* @param {Code_IncorrectInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const code_incorrect = /** @type {((inputs?: Code_IncorrectInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Code_IncorrectInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.code_incorrect(inputs)
	return __da.code_incorrect(inputs)
});
export { code_incorrect as "code.incorrect" }
/**
* | output |
* | --- |
* | "Verify Code" |
*
* @param {Code_VerifyInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const code_verify = /** @type {((inputs?: Code_VerifyInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Code_VerifyInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.code_verify(inputs)
	return __da.code_verify(inputs)
});
export { code_verify as "code.verify" }
/**
* | output |
* | --- |
* | "Verifying..." |
*
* @param {Code_VerifyingInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const code_verifying = /** @type {((inputs?: Code_VerifyingInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Code_VerifyingInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.code_verifying(inputs)
	return __da.code_verifying(inputs)
});
export { code_verifying as "code.verifying" }
/**
* | output |
* | --- |
* | "Invalid or expired code. Perhaps you have a newer code." |
*
* @param {Error_Invalidcode1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const error_invalidcode1 = /** @type {((inputs?: Error_Invalidcode1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_Invalidcode1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.error_invalidcode1(inputs)
	return __da.error_invalidcode1(inputs)
});
export { error_invalidcode1 as "error.invalidCode" }
/**
* | output |
* | --- |
* | "We sent a verification code by email" |
*
* @param {Status_Emailsent1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const status_emailsent1 = /** @type {((inputs?: Status_Emailsent1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Status_Emailsent1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.status_emailsent1(inputs)
	return __da.status_emailsent1(inputs)
});
export { status_emailsent1 as "status.emailSent" }
/**
* | output |
* | --- |
* | "Check your email" |
*
* @param {Status_Checkemail1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const status_checkemail1 = /** @type {((inputs?: Status_Checkemail1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Status_Checkemail1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.status_checkemail1(inputs)
	return __da.status_checkemail1(inputs)
});
export { status_checkemail1 as "status.checkEmail" }
/**
* | output |
* | --- |
* | "A valid pin was already sent to you, good for {minutes} minute{s}." |
*
* @param {Status_Pinvalid1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const status_pinvalid1 = /** @type {((inputs: Status_Pinvalid1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Status_Pinvalid1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.status_pinvalid1(inputs)
	return __da.status_pinvalid1(inputs)
});
export { status_pinvalid1 as "status.pinValid" }
/**
* | output |
* | --- |
* | "Enter pin here" |
*
* @param {Status_Pindirectaction2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const status_pindirectaction2 = /** @type {((inputs?: Status_Pindirectaction2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Status_Pindirectaction2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.status_pindirectaction2(inputs)
	return __da.status_pindirectaction2(inputs)
});
export { status_pindirectaction2 as "status.pinDirectAction" }
/**
* | output |
* | --- |
* | "Valid pin detected" |
*
* @param {Status_Pindetected1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const status_pindetected1 = /** @type {((inputs?: Status_Pindetected1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Status_Pindetected1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.status_pindetected1(inputs)
	return __da.status_pindetected1(inputs)
});
export { status_pindetected1 as "status.pinDetected" }
/**
* | output |
* | --- |
* | "Welcome back!" |
*
* @param {Status_Signinsuccess2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const status_signinsuccess2 = /** @type {((inputs?: Status_Signinsuccess2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Status_Signinsuccess2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.status_signinsuccess2(inputs)
	return __da.status_signinsuccess2(inputs)
});
export { status_signinsuccess2 as "status.signInSuccess" }
/**
* | output |
* | --- |
* | "We sent a secure login link to" |
*
* @param {Status_Magiclinksent2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const status_magiclinksent2 = /** @type {((inputs?: Status_Magiclinksent2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Status_Magiclinksent2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.status_magiclinksent2(inputs)
	return __da.status_magiclinksent2(inputs)
});
export { status_magiclinksent2 as "status.magicLinkSent" }
/**
* | output |
* | --- |
* | "Networking error." |
*
* @param {Error_NetworkInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const error_network = /** @type {((inputs?: Error_NetworkInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_NetworkInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.error_network(inputs)
	return __da.error_network(inputs)
});
export { error_network as "error.network" }
/**
* | output |
* | --- |
* | "No account found with this email address" |
*
* @param {Error_Usernotfound2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const error_usernotfound2 = /** @type {((inputs?: Error_Usernotfound2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_Usernotfound2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.error_usernotfound2(inputs)
	return __da.error_usernotfound2(inputs)
});
export { error_usernotfound2 as "error.userNotFound" }
/**
* | output |
* | --- |
* | "Invalid email or authentication failed" |
*
* @param {Error_Invalidcredentials1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const error_invalidcredentials1 = /** @type {((inputs?: Error_Invalidcredentials1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_Invalidcredentials1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.error_invalidcredentials1(inputs)
	return __da.error_invalidcredentials1(inputs)
});
export { error_invalidcredentials1 as "error.invalidCredentials" }
/**
* | output |
* | --- |
* | "Service temporarily unavailable." |
*
* @param {Error_Serviceunavailable1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const error_serviceunavailable1 = /** @type {((inputs?: Error_Serviceunavailable1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_Serviceunavailable1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.error_serviceunavailable1(inputs)
	return __da.error_serviceunavailable1(inputs)
});
export { error_serviceunavailable1 as "error.serviceUnavailable" }
/**
* | output |
* | --- |
* | "An unexpected error occurred" |
*
* @param {Error_UnknownInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const error_unknown = /** @type {((inputs?: Error_UnknownInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_UnknownInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.error_unknown(inputs)
	return __da.error_unknown(inputs)
});
export { error_unknown as "error.unknown" }
/**
* | output |
* | --- |
* | "Too many attempts." |
*
* @param {Error_Ratelimited1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const error_ratelimited1 = /** @type {((inputs?: Error_Ratelimited1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_Ratelimited1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.error_ratelimited1(inputs)
	return __da.error_ratelimited1(inputs)
});
export { error_ratelimited1 as "error.rateLimited" }
/**
* | output |
* | --- |
* | "Invalid input." |
*
* @param {Error_Invalidinput1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const error_invalidinput1 = /** @type {((inputs?: Error_Invalidinput1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_Invalidinput1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.error_invalidinput1(inputs)
	return __da.error_invalidinput1(inputs)
});
export { error_invalidinput1 as "error.invalidInput" }
/**
* | output |
* | --- |
* | "Authentication was cancelled." |
*
* @param {Error_Authcancelled1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const error_authcancelled1 = /** @type {((inputs?: Error_Authcancelled1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_Authcancelled1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.error_authcancelled1(inputs)
	return __da.error_authcancelled1(inputs)
});
export { error_authcancelled1 as "error.authCancelled" }
/**
* | output |
* | --- |
* | "Authentication failed." |
*
* @param {Error_Authfailed1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const error_authfailed1 = /** @type {((inputs?: Error_Authfailed1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_Authfailed1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.error_authfailed1(inputs)
	return __da.error_authfailed1(inputs)
});
export { error_authfailed1 as "error.authFailed" }
/**
* | output |
* | --- |
* | "Failed to send magic link." |
*
* @param {Error_Magiclinkfailed2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const error_magiclinkfailed2 = /** @type {((inputs?: Error_Magiclinkfailed2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_Magiclinkfailed2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.error_magiclinkfailed2(inputs)
	return __da.error_magiclinkfailed2(inputs)
});
export { error_magiclinkfailed2 as "error.magicLinkFailed" }
/**
* | output |
* | --- |
* | "No authentication methods available for this email." |
*
* @param {Error_Noauthmethods2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const error_noauthmethods2 = /** @type {((inputs?: Error_Noauthmethods2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_Noauthmethods2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.error_noauthmethods2(inputs)
	return __da.error_noauthmethods2(inputs)
});
export { error_noauthmethods2 as "error.noAuthMethods" }
/**
* | output |
* | --- |
* | "No passkey found for this email." |
*
* @param {Error_Nopasskeyfound2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const error_nopasskeyfound2 = /** @type {((inputs?: Error_Nopasskeyfound2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_Nopasskeyfound2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.error_nopasskeyfound2(inputs)
	return __da.error_nopasskeyfound2(inputs)
});
export { error_nopasskeyfound2 as "error.noPasskeyFound" }
/**
* | output |
* | --- |
* | "Passkey authentication is not supported on this device." |
*
* @param {Error_Passkeynotsupported2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const error_passkeynotsupported2 = /** @type {((inputs?: Error_Passkeynotsupported2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_Passkeynotsupported2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.error_passkeynotsupported2(inputs)
	return __da.error_passkeynotsupported2(inputs)
});
export { error_passkeynotsupported2 as "error.passkeyNotSupported" }
/**
* | output |
* | --- |
* | "Security error occurred." |
*
* @param {Error_Securityerror1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const error_securityerror1 = /** @type {((inputs?: Error_Securityerror1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_Securityerror1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.error_securityerror1(inputs)
	return __da.error_securityerror1(inputs)
});
export { error_securityerror1 as "error.securityError" }
/**
* | output |
* | --- |
* | "No passkey available on this device." |
*
* @param {Error_Nopasskeyavailable2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const error_nopasskeyavailable2 = /** @type {((inputs?: Error_Nopasskeyavailable2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_Nopasskeyavailable2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.error_nopasskeyavailable2(inputs)
	return __da.error_nopasskeyavailable2(inputs)
});
export { error_nopasskeyavailable2 as "error.noPasskeyAvailable" }
/**
* | output |
* | --- |
* | "Registration failed" |
*
* @param {Error_Registrationfailed1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const error_registrationfailed1 = /** @type {((inputs?: Error_Registrationfailed1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_Registrationfailed1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.error_registrationfailed1(inputs)
	return __da.error_registrationfailed1(inputs)
});
export { error_registrationfailed1 as "error.registrationFailed" }
/**
* | output |
* | --- |
* | "An unexpected error occurred." |
*
* @param {Error_Unknownerror1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const error_unknownerror1 = /** @type {((inputs?: Error_Unknownerror1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_Unknownerror1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.error_unknownerror1(inputs)
	return __da.error_unknownerror1(inputs)
});
export { error_unknownerror1 as "error.unknownError" }
/**
* | output |
* | --- |
* | "Only registered users can sign in. Please contact support if you need access." |
*
* @param {Auth_Onlyregisteredusers2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const auth_onlyregisteredusers2 = /** @type {((inputs?: Auth_Onlyregisteredusers2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Auth_Onlyregisteredusers2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.auth_onlyregisteredusers2(inputs)
	return __da.auth_onlyregisteredusers2(inputs)
});
export { auth_onlyregisteredusers2 as "auth.onlyRegisteredUsers" }
/**
* | output |
* | --- |
* | "Full Name" |
*
* @param {Auth_Fullname1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const auth_fullname1 = /** @type {((inputs?: Auth_Fullname1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Auth_Fullname1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.auth_fullname1(inputs)
	return __da.auth_fullname1(inputs)
});
export { auth_fullname1 as "auth.fullName" }
/**
* | output |
* | --- |
* | "Enter your full name" |
*
* @param {Auth_Fullnameplaceholder2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const auth_fullnameplaceholder2 = /** @type {((inputs?: Auth_Fullnameplaceholder2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Auth_Fullnameplaceholder2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.auth_fullnameplaceholder2(inputs)
	return __da.auth_fullnameplaceholder2(inputs)
});
export { auth_fullnameplaceholder2 as "auth.fullNamePlaceholder" }
/**
* | output |
* | --- |
* | "As a new user you will have to review and confirm the terms of service after signing-in via e-mail." |
*
* @param {Auth_Newusertermsnotice3Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const auth_newusertermsnotice3 = /** @type {((inputs?: Auth_Newusertermsnotice3Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Auth_Newusertermsnotice3Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.auth_newusertermsnotice3(inputs)
	return __da.auth_newusertermsnotice3(inputs)
});
export { auth_newusertermsnotice3 as "auth.newUserTermsNotice" }
/**
* | output |
* | --- |
* | "Successfully signed in!" |
*
* @param {Auth_Signedinsuccess2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const auth_signedinsuccess2 = /** @type {((inputs?: Auth_Signedinsuccess2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Auth_Signedinsuccess2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.auth_signedinsuccess2(inputs)
	return __da.auth_signedinsuccess2(inputs)
});
export { auth_signedinsuccess2 as "auth.signedInSuccess" }
/**
* | output |
* | --- |
* | "🔐 WebAuthn ready - Touch ID/Face ID will appear automatically" |
*
* @param {Webauthn_ReadyInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const webauthn_ready = /** @type {((inputs?: Webauthn_ReadyInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Webauthn_ReadyInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.webauthn_ready(inputs)
	return __da.webauthn_ready(inputs)
});
export { webauthn_ready as "webauthn.ready" }
/**
* | output |
* | --- |
* | "Touch ID" |
*
* @param {Webauthn_Touchid1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const webauthn_touchid1 = /** @type {((inputs?: Webauthn_Touchid1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Webauthn_Touchid1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.webauthn_touchid1(inputs)
	return __da.webauthn_touchid1(inputs)
});
export { webauthn_touchid1 as "webauthn.touchId" }
/**
* | output |
* | --- |
* | "Face ID" |
*
* @param {Webauthn_Faceid1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const webauthn_faceid1 = /** @type {((inputs?: Webauthn_Faceid1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Webauthn_Faceid1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.webauthn_faceid1(inputs)
	return __da.webauthn_faceid1(inputs)
});
export { webauthn_faceid1 as "webauthn.faceId" }
/**
* | output |
* | --- |
* | "Authentication was cancelled" |
*
* @param {Webauthn_CancelledInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const webauthn_cancelled = /** @type {((inputs?: Webauthn_CancelledInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Webauthn_CancelledInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.webauthn_cancelled(inputs)
	return __da.webauthn_cancelled(inputs)
});
export { webauthn_cancelled as "webauthn.cancelled" }
/**
* | output |
* | --- |
* | "WebAuthn is not supported on this device" |
*
* @param {Webauthn_Notsupported1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const webauthn_notsupported1 = /** @type {((inputs?: Webauthn_Notsupported1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Webauthn_Notsupported1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.webauthn_notsupported1(inputs)
	return __da.webauthn_notsupported1(inputs)
});
export { webauthn_notsupported1 as "webauthn.notSupported" }
/**
* | output |
* | --- |
* | "{companyName} uses passwordless authentication with biometric passkeys or secure email links for enhanced security and convenience." |
*
* @param {Security_Passwordlessexplanation1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const security_passwordlessexplanation1 = /** @type {((inputs: Security_Passwordlessexplanation1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Security_Passwordlessexplanation1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.security_passwordlessexplanation1(inputs)
	return __da.security_passwordlessexplanation1(inputs)
});
export { security_passwordlessexplanation1 as "security.passwordlessExplanation" }
/**
* | output |
* | --- |
* | "Passwordless authentication with biometric passkeys or secure email links for enhanced security and convenience." |
*
* @param {Security_Passwordlessgeneric1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const security_passwordlessgeneric1 = /** @type {((inputs?: Security_Passwordlessgeneric1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Security_Passwordlessgeneric1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.security_passwordlessgeneric1(inputs)
	return __da.security_passwordlessgeneric1(inputs)
});
export { security_passwordlessgeneric1 as "security.passwordlessGeneric" }
/**
* | output |
* | --- |
* | "{companyName} uses passwordless authentication with biometric passkeys or secure email pins for enhanced security and convenience." |
*
* @param {Security_Passwordlesswithpin2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const security_passwordlesswithpin2 = /** @type {((inputs: Security_Passwordlesswithpin2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Security_Passwordlesswithpin2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.security_passwordlesswithpin2(inputs)
	return __da.security_passwordlesswithpin2(inputs)
});
export { security_passwordlesswithpin2 as "security.passwordlessWithPin" }
/**
* | output |
* | --- |
* | "Passwordless authentication with biometric passkeys or secure email pins for enhanced security and convenience." |
*
* @param {Security_Passwordlesswithpingeneric3Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const security_passwordlesswithpingeneric3 = /** @type {((inputs?: Security_Passwordlesswithpingeneric3Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Security_Passwordlesswithpingeneric3Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.security_passwordlesswithpingeneric3(inputs)
	return __da.security_passwordlesswithpingeneric3(inputs)
});
export { security_passwordlesswithpingeneric3 as "security.passwordlessWithPinGeneric" }
/**
* | output |
* | --- |
* | "Secure passkey authentication" |
*
* @param {Explainer_Features_Securepasskey1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const explainer_features_securepasskey1 = /** @type {((inputs?: Explainer_Features_Securepasskey1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Explainer_Features_Securepasskey1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.explainer_features_securepasskey1(inputs)
	return __da.explainer_features_securepasskey1(inputs)
});
export { explainer_features_securepasskey1 as "explainer.features.securePasskey" }
/**
* | output |
* | --- |
* | "Privacy-compliant access" |
*
* @param {Explainer_Features_Privacycompliant1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const explainer_features_privacycompliant1 = /** @type {((inputs?: Explainer_Features_Privacycompliant1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Explainer_Features_Privacycompliant1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.explainer_features_privacycompliant1(inputs)
	return __da.explainer_features_privacycompliant1(inputs)
});
export { explainer_features_privacycompliant1 as "explainer.features.privacyCompliant" }
/**
* | output |
* | --- |
* | "Employee verification required" |
*
* @param {Explainer_Features_Employeeverification1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const explainer_features_employeeverification1 = /** @type {((inputs?: Explainer_Features_Employeeverification1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Explainer_Features_Employeeverification1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.explainer_features_employeeverification1(inputs)
	return __da.explainer_features_employeeverification1(inputs)
});
export { explainer_features_employeeverification1 as "explainer.features.employeeVerification" }
/**
* | output |
* | --- |
* | "User verification required" |
*
* @param {Explainer_Features_Userverification1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const explainer_features_userverification1 = /** @type {((inputs?: Explainer_Features_Userverification1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Explainer_Features_Userverification1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.explainer_features_userverification1(inputs)
	return __da.explainer_features_userverification1(inputs)
});
export { explainer_features_userverification1 as "explainer.features.userVerification" }
/**
* | output |
* | --- |
* | "See our <a onclick='showPolicyPopup()'>Privacy and Acceptable Use Policy</a>" |
*
* @param {Explainer_Features_Seepolicies1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const explainer_features_seepolicies1 = /** @type {((inputs?: Explainer_Features_Seepolicies1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Explainer_Features_Seepolicies1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.explainer_features_seepolicies1(inputs)
	return __da.explainer_features_seepolicies1(inputs)
});
export { explainer_features_seepolicies1 as "explainer.features.seePolicies" }
/**
* | output |
* | --- |
* | "Try again" |
*
* @param {Action_RetryInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const action_retry = /** @type {((inputs?: Action_RetryInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Action_RetryInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.action_retry(inputs)
	return __da.action_retry(inputs)
});
export { action_retry as "action.retry" }
/**
* | output |
* | --- |
* | "Back" |
*
* @param {Action_BackInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const action_back = /** @type {((inputs?: Action_BackInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Action_BackInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.action_back(inputs)
	return __da.action_back(inputs)
});
export { action_back as "action.back" }
/**
* | output |
* | --- |
* | "Continue" |
*
* @param {Action_ContinueInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const action_continue = /** @type {((inputs?: Action_ContinueInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Action_ContinueInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.action_continue(inputs)
	return __da.action_continue(inputs)
});
export { action_continue as "action.continue" }
/**
* | output |
* | --- |
* | "Cancel" |
*
* @param {Action_CancelInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const action_cancel = /** @type {((inputs?: Action_CancelInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Action_CancelInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.action_cancel(inputs)
	return __da.action_cancel(inputs)
});
export { action_cancel as "action.cancel" }
/**
* | output |
* | --- |
* | "Use a different email" |
*
* @param {Action_Usedifferentemail2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const action_usedifferentemail2 = /** @type {((inputs?: Action_Usedifferentemail2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Action_Usedifferentemail2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.action_usedifferentemail2(inputs)
	return __da.action_usedifferentemail2(inputs)
});
export { action_usedifferentemail2 as "action.useDifferentEmail" }
/**
* | output |
* | --- |
* | "Sign in" |
*
* @param {Signin_Title1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const signin_title1 = /** @type {((inputs?: Signin_Title1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Signin_Title1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.signin_title1(inputs)
	return __da.signin_title1(inputs)
});
export { signin_title1 as "signIn.title" }
/**
* | output |
* | --- |
* | "Enter your email to continue to {companyName}" |
*
* @param {Signin_Subtitle1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const signin_subtitle1 = /** @type {((inputs: Signin_Subtitle1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Signin_Subtitle1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.signin_subtitle1(inputs)
	return __da.signin_subtitle1(inputs)
});
export { signin_subtitle1 as "signIn.subtitle" }
/**
* | output |
* | --- |
* | "Enter your email to continue to your account" |
*
* @param {Signin_Subtitlegeneric2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const signin_subtitlegeneric2 = /** @type {((inputs?: Signin_Subtitlegeneric2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Signin_Subtitlegeneric2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.signin_subtitlegeneric2(inputs)
	return __da.signin_subtitlegeneric2(inputs)
});
export { signin_subtitlegeneric2 as "signIn.subtitleGeneric" }
/**
* | output |
* | --- |
* | "🔐 WebAuthn ready - Touch ID/Face ID will appear automatically" |
*
* @param {Signin_Webauthnindicator3Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const signin_webauthnindicator3 = /** @type {((inputs?: Signin_Webauthnindicator3Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Signin_Webauthnindicator3Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.signin_webauthnindicator3(inputs)
	return __da.signin_webauthnindicator3(inputs)
});
export { signin_webauthnindicator3 as "signIn.webAuthnIndicator" }
/**
* | output |
* | --- |
* | "Check your email" |
*
* @param {Magiclink_Title1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const magiclink_title1 = /** @type {((inputs?: Magiclink_Title1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Magiclink_Title1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.magiclink_title1(inputs)
	return __da.magiclink_title1(inputs)
});
export { magiclink_title1 as "magicLink.title" }
/**
* | output |
* | --- |
* | "We sent a secure login link to" |
*
* @param {Magiclink_Description1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const magiclink_description1 = /** @type {((inputs?: Magiclink_Description1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Magiclink_Description1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.magiclink_description1(inputs)
	return __da.magiclink_description1(inputs)
});
export { magiclink_description1 as "magicLink.description" }
/**
* | output |
* | --- |
* | "Use a different email" |
*
* @param {Magiclink_Differentemail2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const magiclink_differentemail2 = /** @type {((inputs?: Magiclink_Differentemail2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Magiclink_Differentemail2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.magiclink_differentemail2(inputs)
	return __da.magiclink_differentemail2(inputs)
});
export { magiclink_differentemail2 as "magicLink.differentEmail" }
/**
* | output |
* | --- |
* | "Terms & Privacy" |
*
* @param {Registration_Termstitle1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const registration_termstitle1 = /** @type {((inputs?: Registration_Termstitle1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Registration_Termstitle1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.registration_termstitle1(inputs)
	return __da.registration_termstitle1(inputs)
});
export { registration_termstitle1 as "registration.termsTitle" }
/**
* | output |
* | --- |
* | "Please review and accept our terms to create your account" |
*
* @param {Registration_Termsdescription1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const registration_termsdescription1 = /** @type {((inputs?: Registration_Termsdescription1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Registration_Termsdescription1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.registration_termsdescription1(inputs)
	return __da.registration_termsdescription1(inputs)
});
export { registration_termsdescription1 as "registration.termsDescription" }
/**
* | output |
* | --- |
* | "I agree to the" |
*
* @param {Registration_Agreeterms1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const registration_agreeterms1 = /** @type {((inputs?: Registration_Agreeterms1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Registration_Agreeterms1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.registration_agreeterms1(inputs)
	return __da.registration_agreeterms1(inputs)
});
export { registration_agreeterms1 as "registration.agreeTerms" }
/**
* | output |
* | --- |
* | "I agree to the" |
*
* @param {Registration_Agreeprivacy1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const registration_agreeprivacy1 = /** @type {((inputs?: Registration_Agreeprivacy1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Registration_Agreeprivacy1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.registration_agreeprivacy1(inputs)
	return __da.registration_agreeprivacy1(inputs)
});
export { registration_agreeprivacy1 as "registration.agreePrivacy" }
/**
* | output |
* | --- |
* | "Terms of Service" |
*
* @param {Registration_Termslink1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const registration_termslink1 = /** @type {((inputs?: Registration_Termslink1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Registration_Termslink1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.registration_termslink1(inputs)
	return __da.registration_termslink1(inputs)
});
export { registration_termslink1 as "registration.termsLink" }
/**
* | output |
* | --- |
* | "Privacy Policy" |
*
* @param {Registration_Privacylink1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const registration_privacylink1 = /** @type {((inputs?: Registration_Privacylink1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Registration_Privacylink1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.registration_privacylink1(inputs)
	return __da.registration_privacylink1(inputs)
});
export { registration_privacylink1 as "registration.privacyLink" }
/**
* | output |
* | --- |
* | "Create Account" |
*
* @param {Registration_Createaccount1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const registration_createaccount1 = /** @type {((inputs?: Registration_Createaccount1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Registration_Createaccount1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.registration_createaccount1(inputs)
	return __da.registration_createaccount1(inputs)
});
export { registration_createaccount1 as "registration.createAccount" }
/**
* | output |
* | --- |
* | "Creating Account..." |
*
* @param {Registration_Creatingaccount1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const registration_creatingaccount1 = /** @type {((inputs?: Registration_Creatingaccount1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Registration_Creatingaccount1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.registration_creatingaccount1(inputs)
	return __da.registration_creatingaccount1(inputs)
});
export { registration_creatingaccount1 as "registration.creatingAccount" }
/**
* | output |
* | --- |
* | "🔐 Your device will prompt for Touch ID, Face ID, or Windows Hello" |
*
* @param {Registration_Webauthninfo2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const registration_webauthninfo2 = /** @type {((inputs?: Registration_Webauthninfo2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Registration_Webauthninfo2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.registration_webauthninfo2(inputs)
	return __da.registration_webauthninfo2(inputs)
});
export { registration_webauthninfo2 as "registration.webAuthnInfo" }
/**
* | output |
* | --- |
* | "Account Created Successfully!" |
*
* @param {Registration_Successtitle1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const registration_successtitle1 = /** @type {((inputs?: Registration_Successtitle1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Registration_Successtitle1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.registration_successtitle1(inputs)
	return __da.registration_successtitle1(inputs)
});
export { registration_successtitle1 as "registration.successTitle" }
/**
* | output |
* | --- |
* | "Welcome to {companyName}!" |
*
* @param {Registration_Successdescription1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const registration_successdescription1 = /** @type {((inputs: Registration_Successdescription1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Registration_Successdescription1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.registration_successdescription1(inputs)
	return __da.registration_successdescription1(inputs)
});
export { registration_successdescription1 as "registration.successDescription" }
/**
* | output |
* | --- |
* | "Welcome to our platform!" |
*
* @param {Registration_Successdescriptiongeneric2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const registration_successdescriptiongeneric2 = /** @type {((inputs?: Registration_Successdescriptiongeneric2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Registration_Successdescriptiongeneric2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.registration_successdescriptiongeneric2(inputs)
	return __da.registration_successdescriptiongeneric2(inputs)
});
export { registration_successdescriptiongeneric2 as "registration.successDescriptionGeneric" }
/**
* | output |
* | --- |
* | "You can now explore the application." |
*
* @param {Registration_Successexplore1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const registration_successexplore1 = /** @type {((inputs?: Registration_Successexplore1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Registration_Successexplore1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.registration_successexplore1(inputs)
	return __da.registration_successexplore1(inputs)
});
export { registration_successexplore1 as "registration.successExplore" }
/**
* | output |
* | --- |
* | "📧 We've sent a welcome email to" |
*
* @param {Registration_Welcomeemail1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const registration_welcomeemail1 = /** @type {((inputs?: Registration_Welcomeemail1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Registration_Welcomeemail1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.registration_welcomeemail1(inputs)
	return __da.registration_welcomeemail1(inputs)
});
export { registration_welcomeemail1 as "registration.welcomeEmail" }
/**
* | output |
* | --- |
* | "🔓 Verify your email to unlock all features" |
*
* @param {Registration_Verifyemail1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const registration_verifyemail1 = /** @type {((inputs?: Registration_Verifyemail1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Registration_Verifyemail1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.registration_verifyemail1(inputs)
	return __da.registration_verifyemail1(inputs)
});
export { registration_verifyemail1 as "registration.verifyEmail" }
/**
* | output |
* | --- |
* | "Registration is required. Please complete the registration process." |
*
* @param {Registration_RequiredInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const registration_required = /** @type {((inputs?: Registration_RequiredInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Registration_RequiredInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.registration_required(inputs)
	return __da.registration_required(inputs)
});
export { registration_required as "registration.required" }
/**
* | output |
* | --- |
* | "You must accept the Terms of Service and Privacy Policy to continue." |
*
* @param {Terms_Acceptrequired1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const terms_acceptrequired1 = /** @type {((inputs?: Terms_Acceptrequired1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Terms_Acceptrequired1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.terms_acceptrequired1(inputs)
	return __da.terms_acceptrequired1(inputs)
});
export { terms_acceptrequired1 as "terms.acceptRequired" }
/**
* | output |
* | --- |
* | "You must accept the privacy policy" |
*
* @param {Privacy_Acceptrequired1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const privacy_acceptrequired1 = /** @type {((inputs?: Privacy_Acceptrequired1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Privacy_Acceptrequired1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.privacy_acceptrequired1(inputs)
	return __da.privacy_acceptrequired1(inputs)
});
export { privacy_acceptrequired1 as "privacy.acceptRequired" }
/**
* | output |
* | --- |
* | "I accept the {companyName} Terms of Service" |
*
* @param {Registration_TermsInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const registration_terms = /** @type {((inputs: Registration_TermsInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Registration_TermsInputs, { locale?: "en" | "da" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.registration_terms(inputs)
	return __da.registration_terms(inputs)
});
export { registration_terms as "registration.terms" }
/**
* | output |
* | --- |
* | "I accept the {companyName} Privacy Policy" |
*
* @param {Registration_PrivacyInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const registration_privacy = /** @type {((inputs: Registration_PrivacyInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Registration_PrivacyInputs, { locale?: "en" | "da" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.registration_privacy(inputs)
	return __da.registration_privacy(inputs)
});
export { registration_privacy as "registration.privacy" }
/**
* | output |
* | --- |
* | "Completing registration..." |
*
* @param {Registration_CompletingInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const registration_completing = /** @type {((inputs?: Registration_CompletingInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Registration_CompletingInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.registration_completing(inputs)
	return __da.registration_completing(inputs)
});
export { registration_completing as "registration.completing" }
/**
* | output |
* | --- |
* | "Terms of Service must be accepted" |
*
* @param {Registration_Termsservicerequired2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const registration_termsservicerequired2 = /** @type {((inputs?: Registration_Termsservicerequired2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Registration_Termsservicerequired2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.registration_termsservicerequired2(inputs)
	return __da.registration_termsservicerequired2(inputs)
});
export { registration_termsservicerequired2 as "registration.termsServiceRequired" }
/**
* | output |
* | --- |
* | "Secured by" |
*
* @param {Branding_Securedby1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const branding_securedby1 = /** @type {((inputs?: Branding_Securedby1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Branding_Securedby1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.branding_securedby1(inputs)
	return __da.branding_securedby1(inputs)
});
export { branding_securedby1 as "branding.securedBy" }
/**
* | output |
* | --- |
* | "Thepia" |
*
* @param {Branding_Poweredby1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const branding_poweredby1 = /** @type {((inputs?: Branding_Poweredby1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Branding_Poweredby1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.branding_poweredby1(inputs)
	return __da.branding_poweredby1(inputs)
});
export { branding_poweredby1 as "branding.poweredBy" }
/**
* | output |
* | --- |
* | "minute" |
*
* @param {Time_MinuteInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const time_minute = /** @type {((inputs?: Time_MinuteInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Time_MinuteInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.time_minute(inputs)
	return __da.time_minute(inputs)
});
export { time_minute as "time.minute" }
/**
* | output |
* | --- |
* | "minutes" |
*
* @param {Time_MinutesInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const time_minutes = /** @type {((inputs?: Time_MinutesInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Time_MinutesInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.time_minutes(inputs)
	return __da.time_minutes(inputs)
});
export { time_minutes as "time.minutes" }
/**
* | output |
* | --- |
* | "second" |
*
* @param {Time_SecondInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const time_second = /** @type {((inputs?: Time_SecondInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Time_SecondInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.time_second(inputs)
	return __da.time_second(inputs)
});
export { time_second as "time.second" }
/**
* | output |
* | --- |
* | "seconds" |
*
* @param {Time_SecondsInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const time_seconds = /** @type {((inputs?: Time_SecondsInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Time_SecondsInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.time_seconds(inputs)
	return __da.time_seconds(inputs)
});
export { time_seconds as "time.seconds" }
/**
* | output |
* | --- |
* | "Welcome back!" |
*
* @param {User_Welcomeback1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const user_welcomeback1 = /** @type {((inputs?: User_Welcomeback1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<User_Welcomeback1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.user_welcomeback1(inputs)
	return __da.user_welcomeback1(inputs)
});
export { user_welcomeback1 as "user.welcomeBack" }
/**
* | output |
* | --- |
* | "Sign out" |
*
* @param {User_Signout1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const user_signout1 = /** @type {((inputs?: User_Signout1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<User_Signout1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.user_signout1(inputs)
	return __da.user_signout1(inputs)
});
export { user_signout1 as "user.signOut" }
/**
* | output |
* | --- |
* | "Security" |
*
* @param {User_Security_TitleInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const user_security_title = /** @type {((inputs?: User_Security_TitleInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<User_Security_TitleInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.user_security_title(inputs)
	return __da.user_security_title(inputs)
});
export { user_security_title as "user.security.title" }
/**
* | output |
* | --- |
* | "Manage your passkeys, authentication methods, and security settings." |
*
* @param {User_Security_DescriptionInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const user_security_description = /** @type {((inputs?: User_Security_DescriptionInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<User_Security_DescriptionInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.user_security_description(inputs)
	return __da.user_security_description(inputs)
});
export { user_security_description as "user.security.description" }
/**
* | output |
* | --- |
* | "Manage Passkeys" |
*
* @param {User_Security_Managepasskeys1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const user_security_managepasskeys1 = /** @type {((inputs?: User_Security_Managepasskeys1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<User_Security_Managepasskeys1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.user_security_managepasskeys1(inputs)
	return __da.user_security_managepasskeys1(inputs)
});
export { user_security_managepasskeys1 as "user.security.managePasskeys" }
/**
* | output |
* | --- |
* | "Profile" |
*
* @param {User_Profile_TitleInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const user_profile_title = /** @type {((inputs?: User_Profile_TitleInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<User_Profile_TitleInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.user_profile_title(inputs)
	return __da.user_profile_title(inputs)
});
export { user_profile_title as "user.profile.title" }
/**
* | output |
* | --- |
* | "Update your personal information and account preferences." |
*
* @param {User_Profile_DescriptionInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const user_profile_description = /** @type {((inputs?: User_Profile_DescriptionInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<User_Profile_DescriptionInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.user_profile_description(inputs)
	return __da.user_profile_description(inputs)
});
export { user_profile_description as "user.profile.description" }
/**
* | output |
* | --- |
* | "Edit Profile" |
*
* @param {User_Profile_Editprofile1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const user_profile_editprofile1 = /** @type {((inputs?: User_Profile_Editprofile1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<User_Profile_Editprofile1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.user_profile_editprofile1(inputs)
	return __da.user_profile_editprofile1(inputs)
});
export { user_profile_editprofile1 as "user.profile.editProfile" }
/**
* | output |
* | --- |
* | "Privacy & Legal" |
*
* @param {User_Privacy_TitleInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const user_privacy_title = /** @type {((inputs?: User_Privacy_TitleInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<User_Privacy_TitleInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.user_privacy_title(inputs)
	return __da.user_privacy_title(inputs)
});
export { user_privacy_title as "user.privacy.title" }
/**
* | output |
* | --- |
* | "Review data policies, terms of service, and privacy settings." |
*
* @param {User_Privacy_DescriptionInputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const user_privacy_description = /** @type {((inputs?: User_Privacy_DescriptionInputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<User_Privacy_DescriptionInputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.user_privacy_description(inputs)
	return __da.user_privacy_description(inputs)
});
export { user_privacy_description as "user.privacy.description" }
/**
* | output |
* | --- |
* | "Data Policy" |
*
* @param {User_Privacy_Datapolicy1Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const user_privacy_datapolicy1 = /** @type {((inputs?: User_Privacy_Datapolicy1Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<User_Privacy_Datapolicy1Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.user_privacy_datapolicy1(inputs)
	return __da.user_privacy_datapolicy1(inputs)
});
export { user_privacy_datapolicy1 as "user.privacy.dataPolicy" }
/**
* | output |
* | --- |
* | "Terms of Service" |
*
* @param {User_Privacy_Termsofservice2Inputs} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {LocalizedString}
*/
const user_privacy_termsofservice2 = /** @type {((inputs?: User_Privacy_Termsofservice2Inputs, options?: { locale?: "en" | "da" }) => LocalizedString) & import('../runtime.js').MessageMetadata<User_Privacy_Termsofservice2Inputs, { locale?: "en" | "da" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return __en.user_privacy_termsofservice2(inputs)
	return __da.user_privacy_termsofservice2(inputs)
});
export { user_privacy_termsofservice2 as "user.privacy.termsOfService" }
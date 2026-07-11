/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from "../runtime.js"
import * as en from "./en.js"
import * as da from "./da.js"
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const email_label = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.email_label(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("email_label", locale)
	if (locale === "en") return en.email_label(inputs)
	return da.email_label(inputs)
};
export { email_label as "email.label" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const email_placeholder = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.email_placeholder(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("email_placeholder", locale)
	if (locale === "en") return en.email_placeholder(inputs)
	return da.email_placeholder(inputs)
};
export { email_placeholder as "email.placeholder" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const email_invalid = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.email_invalid(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("email_invalid", locale)
	if (locale === "en") return en.email_invalid(inputs)
	return da.email_invalid(inputs)
};
export { email_invalid as "email.invalid" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const email_required = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.email_required(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("email_required", locale)
	if (locale === "en") return en.email_required(inputs)
	return da.email_required(inputs)
};
export { email_required as "email.required" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ companyName: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const form_signintitle2 = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.form_signintitle2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("form_signintitle2", locale)
	if (locale === "en") return en.form_signintitle2(inputs)
	return da.form_signintitle2(inputs)
};
export { form_signintitle2 as "form.signInTitle" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ companyName: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const form_signindescription2 = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.form_signindescription2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("form_signindescription2", locale)
	if (locale === "en") return en.form_signindescription2(inputs)
	return da.form_signindescription2(inputs)
};
export { form_signindescription2 as "form.signInDescription" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const form_signingeneric2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.form_signingeneric2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("form_signingeneric2", locale)
	if (locale === "en") return en.form_signingeneric2(inputs)
	return da.form_signingeneric2(inputs)
};
export { form_signingeneric2 as "form.signInGeneric" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ companyName: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const form_signingenericdescription3 = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.form_signingenericdescription3(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("form_signingenericdescription3", locale)
	if (locale === "en") return en.form_signingenericdescription3(inputs)
	return da.form_signingenericdescription3(inputs)
};
export { form_signingenericdescription3 as "form.signInGenericDescription" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const auth_signin1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.auth_signin1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("auth_signin1", locale)
	if (locale === "en") return en.auth_signin1(inputs)
	return da.auth_signin1(inputs)
};
export { auth_signin1 as "auth.signIn" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const auth_signinwithpasskey3 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.auth_signinwithpasskey3(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("auth_signinwithpasskey3", locale)
	if (locale === "en") return en.auth_signinwithpasskey3(inputs)
	return da.auth_signinwithpasskey3(inputs)
};
export { auth_signinwithpasskey3 as "auth.signInWithPasskey" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const auth_continuewithtouchid3 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.auth_continuewithtouchid3(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("auth_continuewithtouchid3", locale)
	if (locale === "en") return en.auth_continuewithtouchid3(inputs)
	return da.auth_continuewithtouchid3(inputs)
};
export { auth_continuewithtouchid3 as "auth.continueWithTouchId" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const auth_continuewithfaceid3 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.auth_continuewithfaceid3(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("auth_continuewithfaceid3", locale)
	if (locale === "en") return en.auth_continuewithfaceid3(inputs)
	return da.auth_continuewithfaceid3(inputs)
};
export { auth_continuewithfaceid3 as "auth.continueWithFaceId" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const auth_continuewithbiometric2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.auth_continuewithbiometric2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("auth_continuewithbiometric2", locale)
	if (locale === "en") return en.auth_continuewithbiometric2(inputs)
	return da.auth_continuewithbiometric2(inputs)
};
export { auth_continuewithbiometric2 as "auth.continueWithBiometric" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const auth_continuewithtouchidfaceid5 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.auth_continuewithtouchidfaceid5(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("auth_continuewithtouchidfaceid5", locale)
	if (locale === "en") return en.auth_continuewithtouchidfaceid5(inputs)
	return da.auth_continuewithtouchidfaceid5(inputs)
};
export { auth_continuewithtouchidfaceid5 as "auth.continueWithTouchIdFaceId" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const auth_sendpinbyemail3 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.auth_sendpinbyemail3(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("auth_sendpinbyemail3", locale)
	if (locale === "en") return en.auth_sendpinbyemail3(inputs)
	return da.auth_sendpinbyemail3(inputs)
};
export { auth_sendpinbyemail3 as "auth.sendPinByEmail" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const auth_sendpintoemail3 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.auth_sendpintoemail3(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("auth_sendpintoemail3", locale)
	if (locale === "en") return en.auth_sendpintoemail3(inputs)
	return da.auth_sendpintoemail3(inputs)
};
export { auth_sendpintoemail3 as "auth.sendPinToEmail" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const auth_sendmagiclink2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.auth_sendmagiclink2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("auth_sendmagiclink2", locale)
	if (locale === "en") return en.auth_sendmagiclink2(inputs)
	return da.auth_sendmagiclink2(inputs)
};
export { auth_sendmagiclink2 as "auth.sendMagicLink" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const auth_loading = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.auth_loading(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("auth_loading", locale)
	if (locale === "en") return en.auth_loading(inputs)
	return da.auth_loading(inputs)
};
export { auth_loading as "auth.loading" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const auth_signingin1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.auth_signingin1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("auth_signingin1", locale)
	if (locale === "en") return en.auth_signingin1(inputs)
	return da.auth_signingin1(inputs)
};
export { auth_signingin1 as "auth.signingIn" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const auth_sendingpin1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.auth_sendingpin1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("auth_sendingpin1", locale)
	if (locale === "en") return en.auth_sendingpin1(inputs)
	return da.auth_sendingpin1(inputs)
};
export { auth_sendingpin1 as "auth.sendingPin" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const auth_sendingmagiclink2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.auth_sendingmagiclink2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("auth_sendingmagiclink2", locale)
	if (locale === "en") return en.auth_sendingmagiclink2(inputs)
	return da.auth_sendingmagiclink2(inputs)
};
export { auth_sendingmagiclink2 as "auth.sendingMagicLink" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const auth_authenticating = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.auth_authenticating(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("auth_authenticating", locale)
	if (locale === "en") return en.auth_authenticating(inputs)
	return da.auth_authenticating(inputs)
};
export { auth_authenticating as "auth.authenticating" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const code_label = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.code_label(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("code_label", locale)
	if (locale === "en") return en.code_label(inputs)
	return da.code_label(inputs)
};
export { code_label as "code.label" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const code_placeholder = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.code_placeholder(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("code_placeholder", locale)
	if (locale === "en") return en.code_placeholder(inputs)
	return da.code_placeholder(inputs)
};
export { code_placeholder as "code.placeholder" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const code_invalid = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.code_invalid(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("code_invalid", locale)
	if (locale === "en") return en.code_invalid(inputs)
	return da.code_invalid(inputs)
};
export { code_invalid as "code.invalid" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const code_expired = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.code_expired(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("code_expired", locale)
	if (locale === "en") return en.code_expired(inputs)
	return da.code_expired(inputs)
};
export { code_expired as "code.expired" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const code_incorrect = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.code_incorrect(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("code_incorrect", locale)
	if (locale === "en") return en.code_incorrect(inputs)
	return da.code_incorrect(inputs)
};
export { code_incorrect as "code.incorrect" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const code_verify = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.code_verify(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("code_verify", locale)
	if (locale === "en") return en.code_verify(inputs)
	return da.code_verify(inputs)
};
export { code_verify as "code.verify" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const code_verifying = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.code_verifying(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("code_verifying", locale)
	if (locale === "en") return en.code_verifying(inputs)
	return da.code_verifying(inputs)
};
export { code_verifying as "code.verifying" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const error_invalidcode1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.error_invalidcode1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("error_invalidcode1", locale)
	if (locale === "en") return en.error_invalidcode1(inputs)
	return da.error_invalidcode1(inputs)
};
export { error_invalidcode1 as "error.invalidCode" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const status_emailsent1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.status_emailsent1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("status_emailsent1", locale)
	if (locale === "en") return en.status_emailsent1(inputs)
	return da.status_emailsent1(inputs)
};
export { status_emailsent1 as "status.emailSent" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const status_checkemail1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.status_checkemail1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("status_checkemail1", locale)
	if (locale === "en") return en.status_checkemail1(inputs)
	return da.status_checkemail1(inputs)
};
export { status_checkemail1 as "status.checkEmail" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ minutes: NonNullable<unknown>, s: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const status_pinvalid1 = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.status_pinvalid1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("status_pinvalid1", locale)
	if (locale === "en") return en.status_pinvalid1(inputs)
	return da.status_pinvalid1(inputs)
};
export { status_pinvalid1 as "status.pinValid" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const status_pindirectaction2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.status_pindirectaction2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("status_pindirectaction2", locale)
	if (locale === "en") return en.status_pindirectaction2(inputs)
	return da.status_pindirectaction2(inputs)
};
export { status_pindirectaction2 as "status.pinDirectAction" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const status_pindetected1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.status_pindetected1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("status_pindetected1", locale)
	if (locale === "en") return en.status_pindetected1(inputs)
	return da.status_pindetected1(inputs)
};
export { status_pindetected1 as "status.pinDetected" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const status_signinsuccess2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.status_signinsuccess2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("status_signinsuccess2", locale)
	if (locale === "en") return en.status_signinsuccess2(inputs)
	return da.status_signinsuccess2(inputs)
};
export { status_signinsuccess2 as "status.signInSuccess" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const status_magiclinksent2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.status_magiclinksent2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("status_magiclinksent2", locale)
	if (locale === "en") return en.status_magiclinksent2(inputs)
	return da.status_magiclinksent2(inputs)
};
export { status_magiclinksent2 as "status.magicLinkSent" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const error_network = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.error_network(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("error_network", locale)
	if (locale === "en") return en.error_network(inputs)
	return da.error_network(inputs)
};
export { error_network as "error.network" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const error_usernotfound2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.error_usernotfound2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("error_usernotfound2", locale)
	if (locale === "en") return en.error_usernotfound2(inputs)
	return da.error_usernotfound2(inputs)
};
export { error_usernotfound2 as "error.userNotFound" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const error_invalidcredentials1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.error_invalidcredentials1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("error_invalidcredentials1", locale)
	if (locale === "en") return en.error_invalidcredentials1(inputs)
	return da.error_invalidcredentials1(inputs)
};
export { error_invalidcredentials1 as "error.invalidCredentials" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const error_serviceunavailable1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.error_serviceunavailable1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("error_serviceunavailable1", locale)
	if (locale === "en") return en.error_serviceunavailable1(inputs)
	return da.error_serviceunavailable1(inputs)
};
export { error_serviceunavailable1 as "error.serviceUnavailable" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const error_unknown = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.error_unknown(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("error_unknown", locale)
	if (locale === "en") return en.error_unknown(inputs)
	return da.error_unknown(inputs)
};
export { error_unknown as "error.unknown" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const error_ratelimited1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.error_ratelimited1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("error_ratelimited1", locale)
	if (locale === "en") return en.error_ratelimited1(inputs)
	return da.error_ratelimited1(inputs)
};
export { error_ratelimited1 as "error.rateLimited" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const error_invalidinput1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.error_invalidinput1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("error_invalidinput1", locale)
	if (locale === "en") return en.error_invalidinput1(inputs)
	return da.error_invalidinput1(inputs)
};
export { error_invalidinput1 as "error.invalidInput" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const error_authcancelled1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.error_authcancelled1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("error_authcancelled1", locale)
	if (locale === "en") return en.error_authcancelled1(inputs)
	return da.error_authcancelled1(inputs)
};
export { error_authcancelled1 as "error.authCancelled" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const error_authfailed1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.error_authfailed1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("error_authfailed1", locale)
	if (locale === "en") return en.error_authfailed1(inputs)
	return da.error_authfailed1(inputs)
};
export { error_authfailed1 as "error.authFailed" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const error_magiclinkfailed2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.error_magiclinkfailed2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("error_magiclinkfailed2", locale)
	if (locale === "en") return en.error_magiclinkfailed2(inputs)
	return da.error_magiclinkfailed2(inputs)
};
export { error_magiclinkfailed2 as "error.magicLinkFailed" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const error_noauthmethods2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.error_noauthmethods2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("error_noauthmethods2", locale)
	if (locale === "en") return en.error_noauthmethods2(inputs)
	return da.error_noauthmethods2(inputs)
};
export { error_noauthmethods2 as "error.noAuthMethods" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const error_nopasskeyfound2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.error_nopasskeyfound2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("error_nopasskeyfound2", locale)
	if (locale === "en") return en.error_nopasskeyfound2(inputs)
	return da.error_nopasskeyfound2(inputs)
};
export { error_nopasskeyfound2 as "error.noPasskeyFound" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const error_passkeynotsupported2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.error_passkeynotsupported2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("error_passkeynotsupported2", locale)
	if (locale === "en") return en.error_passkeynotsupported2(inputs)
	return da.error_passkeynotsupported2(inputs)
};
export { error_passkeynotsupported2 as "error.passkeyNotSupported" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const error_securityerror1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.error_securityerror1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("error_securityerror1", locale)
	if (locale === "en") return en.error_securityerror1(inputs)
	return da.error_securityerror1(inputs)
};
export { error_securityerror1 as "error.securityError" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const error_nopasskeyavailable2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.error_nopasskeyavailable2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("error_nopasskeyavailable2", locale)
	if (locale === "en") return en.error_nopasskeyavailable2(inputs)
	return da.error_nopasskeyavailable2(inputs)
};
export { error_nopasskeyavailable2 as "error.noPasskeyAvailable" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const error_registrationfailed1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.error_registrationfailed1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("error_registrationfailed1", locale)
	if (locale === "en") return en.error_registrationfailed1(inputs)
	return da.error_registrationfailed1(inputs)
};
export { error_registrationfailed1 as "error.registrationFailed" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const error_unknownerror1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.error_unknownerror1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("error_unknownerror1", locale)
	if (locale === "en") return en.error_unknownerror1(inputs)
	return da.error_unknownerror1(inputs)
};
export { error_unknownerror1 as "error.unknownError" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const auth_onlyregisteredusers2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.auth_onlyregisteredusers2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("auth_onlyregisteredusers2", locale)
	if (locale === "en") return en.auth_onlyregisteredusers2(inputs)
	return da.auth_onlyregisteredusers2(inputs)
};
export { auth_onlyregisteredusers2 as "auth.onlyRegisteredUsers" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const auth_fullname1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.auth_fullname1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("auth_fullname1", locale)
	if (locale === "en") return en.auth_fullname1(inputs)
	return da.auth_fullname1(inputs)
};
export { auth_fullname1 as "auth.fullName" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const auth_fullnameplaceholder2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.auth_fullnameplaceholder2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("auth_fullnameplaceholder2", locale)
	if (locale === "en") return en.auth_fullnameplaceholder2(inputs)
	return da.auth_fullnameplaceholder2(inputs)
};
export { auth_fullnameplaceholder2 as "auth.fullNamePlaceholder" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const auth_newusertermsnotice3 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.auth_newusertermsnotice3(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("auth_newusertermsnotice3", locale)
	if (locale === "en") return en.auth_newusertermsnotice3(inputs)
	return da.auth_newusertermsnotice3(inputs)
};
export { auth_newusertermsnotice3 as "auth.newUserTermsNotice" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const auth_signedinsuccess2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.auth_signedinsuccess2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("auth_signedinsuccess2", locale)
	if (locale === "en") return en.auth_signedinsuccess2(inputs)
	return da.auth_signedinsuccess2(inputs)
};
export { auth_signedinsuccess2 as "auth.signedInSuccess" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const webauthn_ready = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.webauthn_ready(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("webauthn_ready", locale)
	if (locale === "en") return en.webauthn_ready(inputs)
	return da.webauthn_ready(inputs)
};
export { webauthn_ready as "webauthn.ready" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const webauthn_touchid1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.webauthn_touchid1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("webauthn_touchid1", locale)
	if (locale === "en") return en.webauthn_touchid1(inputs)
	return da.webauthn_touchid1(inputs)
};
export { webauthn_touchid1 as "webauthn.touchId" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const webauthn_faceid1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.webauthn_faceid1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("webauthn_faceid1", locale)
	if (locale === "en") return en.webauthn_faceid1(inputs)
	return da.webauthn_faceid1(inputs)
};
export { webauthn_faceid1 as "webauthn.faceId" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const webauthn_cancelled = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.webauthn_cancelled(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("webauthn_cancelled", locale)
	if (locale === "en") return en.webauthn_cancelled(inputs)
	return da.webauthn_cancelled(inputs)
};
export { webauthn_cancelled as "webauthn.cancelled" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const webauthn_notsupported1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.webauthn_notsupported1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("webauthn_notsupported1", locale)
	if (locale === "en") return en.webauthn_notsupported1(inputs)
	return da.webauthn_notsupported1(inputs)
};
export { webauthn_notsupported1 as "webauthn.notSupported" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ companyName: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const security_passwordlessexplanation1 = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.security_passwordlessexplanation1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("security_passwordlessexplanation1", locale)
	if (locale === "en") return en.security_passwordlessexplanation1(inputs)
	return da.security_passwordlessexplanation1(inputs)
};
export { security_passwordlessexplanation1 as "security.passwordlessExplanation" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const security_passwordlessgeneric1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.security_passwordlessgeneric1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("security_passwordlessgeneric1", locale)
	if (locale === "en") return en.security_passwordlessgeneric1(inputs)
	return da.security_passwordlessgeneric1(inputs)
};
export { security_passwordlessgeneric1 as "security.passwordlessGeneric" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ companyName: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const security_passwordlesswithpin2 = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.security_passwordlesswithpin2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("security_passwordlesswithpin2", locale)
	if (locale === "en") return en.security_passwordlesswithpin2(inputs)
	return da.security_passwordlesswithpin2(inputs)
};
export { security_passwordlesswithpin2 as "security.passwordlessWithPin" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const security_passwordlesswithpingeneric3 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.security_passwordlesswithpingeneric3(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("security_passwordlesswithpingeneric3", locale)
	if (locale === "en") return en.security_passwordlesswithpingeneric3(inputs)
	return da.security_passwordlesswithpingeneric3(inputs)
};
export { security_passwordlesswithpingeneric3 as "security.passwordlessWithPinGeneric" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const explainer_features_securepasskey1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.explainer_features_securepasskey1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("explainer_features_securepasskey1", locale)
	if (locale === "en") return en.explainer_features_securepasskey1(inputs)
	return da.explainer_features_securepasskey1(inputs)
};
export { explainer_features_securepasskey1 as "explainer.features.securePasskey" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const explainer_features_privacycompliant1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.explainer_features_privacycompliant1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("explainer_features_privacycompliant1", locale)
	if (locale === "en") return en.explainer_features_privacycompliant1(inputs)
	return da.explainer_features_privacycompliant1(inputs)
};
export { explainer_features_privacycompliant1 as "explainer.features.privacyCompliant" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const explainer_features_employeeverification1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.explainer_features_employeeverification1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("explainer_features_employeeverification1", locale)
	if (locale === "en") return en.explainer_features_employeeverification1(inputs)
	return da.explainer_features_employeeverification1(inputs)
};
export { explainer_features_employeeverification1 as "explainer.features.employeeVerification" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const explainer_features_userverification1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.explainer_features_userverification1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("explainer_features_userverification1", locale)
	if (locale === "en") return en.explainer_features_userverification1(inputs)
	return da.explainer_features_userverification1(inputs)
};
export { explainer_features_userverification1 as "explainer.features.userVerification" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const explainer_features_seepolicies1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.explainer_features_seepolicies1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("explainer_features_seepolicies1", locale)
	if (locale === "en") return en.explainer_features_seepolicies1(inputs)
	return da.explainer_features_seepolicies1(inputs)
};
export { explainer_features_seepolicies1 as "explainer.features.seePolicies" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const action_retry = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.action_retry(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("action_retry", locale)
	if (locale === "en") return en.action_retry(inputs)
	return da.action_retry(inputs)
};
export { action_retry as "action.retry" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const action_back = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.action_back(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("action_back", locale)
	if (locale === "en") return en.action_back(inputs)
	return da.action_back(inputs)
};
export { action_back as "action.back" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const action_continue = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.action_continue(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("action_continue", locale)
	if (locale === "en") return en.action_continue(inputs)
	return da.action_continue(inputs)
};
export { action_continue as "action.continue" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const action_cancel = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.action_cancel(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("action_cancel", locale)
	if (locale === "en") return en.action_cancel(inputs)
	return da.action_cancel(inputs)
};
export { action_cancel as "action.cancel" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const action_usedifferentemail2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.action_usedifferentemail2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("action_usedifferentemail2", locale)
	if (locale === "en") return en.action_usedifferentemail2(inputs)
	return da.action_usedifferentemail2(inputs)
};
export { action_usedifferentemail2 as "action.useDifferentEmail" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const signin_title1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.signin_title1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("signin_title1", locale)
	if (locale === "en") return en.signin_title1(inputs)
	return da.signin_title1(inputs)
};
export { signin_title1 as "signIn.title" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ companyName: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const signin_subtitle1 = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.signin_subtitle1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("signin_subtitle1", locale)
	if (locale === "en") return en.signin_subtitle1(inputs)
	return da.signin_subtitle1(inputs)
};
export { signin_subtitle1 as "signIn.subtitle" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const signin_subtitlegeneric2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.signin_subtitlegeneric2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("signin_subtitlegeneric2", locale)
	if (locale === "en") return en.signin_subtitlegeneric2(inputs)
	return da.signin_subtitlegeneric2(inputs)
};
export { signin_subtitlegeneric2 as "signIn.subtitleGeneric" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const signin_webauthnindicator3 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.signin_webauthnindicator3(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("signin_webauthnindicator3", locale)
	if (locale === "en") return en.signin_webauthnindicator3(inputs)
	return da.signin_webauthnindicator3(inputs)
};
export { signin_webauthnindicator3 as "signIn.webAuthnIndicator" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const magiclink_title1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.magiclink_title1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("magiclink_title1", locale)
	if (locale === "en") return en.magiclink_title1(inputs)
	return da.magiclink_title1(inputs)
};
export { magiclink_title1 as "magicLink.title" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const magiclink_description1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.magiclink_description1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("magiclink_description1", locale)
	if (locale === "en") return en.magiclink_description1(inputs)
	return da.magiclink_description1(inputs)
};
export { magiclink_description1 as "magicLink.description" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const magiclink_differentemail2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.magiclink_differentemail2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("magiclink_differentemail2", locale)
	if (locale === "en") return en.magiclink_differentemail2(inputs)
	return da.magiclink_differentemail2(inputs)
};
export { magiclink_differentemail2 as "magicLink.differentEmail" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const registration_termstitle1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.registration_termstitle1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("registration_termstitle1", locale)
	if (locale === "en") return en.registration_termstitle1(inputs)
	return da.registration_termstitle1(inputs)
};
export { registration_termstitle1 as "registration.termsTitle" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const registration_termsdescription1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.registration_termsdescription1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("registration_termsdescription1", locale)
	if (locale === "en") return en.registration_termsdescription1(inputs)
	return da.registration_termsdescription1(inputs)
};
export { registration_termsdescription1 as "registration.termsDescription" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const registration_agreeterms1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.registration_agreeterms1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("registration_agreeterms1", locale)
	if (locale === "en") return en.registration_agreeterms1(inputs)
	return da.registration_agreeterms1(inputs)
};
export { registration_agreeterms1 as "registration.agreeTerms" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const registration_agreeprivacy1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.registration_agreeprivacy1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("registration_agreeprivacy1", locale)
	if (locale === "en") return en.registration_agreeprivacy1(inputs)
	return da.registration_agreeprivacy1(inputs)
};
export { registration_agreeprivacy1 as "registration.agreePrivacy" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const registration_termslink1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.registration_termslink1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("registration_termslink1", locale)
	if (locale === "en") return en.registration_termslink1(inputs)
	return da.registration_termslink1(inputs)
};
export { registration_termslink1 as "registration.termsLink" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const registration_privacylink1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.registration_privacylink1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("registration_privacylink1", locale)
	if (locale === "en") return en.registration_privacylink1(inputs)
	return da.registration_privacylink1(inputs)
};
export { registration_privacylink1 as "registration.privacyLink" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const registration_createaccount1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.registration_createaccount1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("registration_createaccount1", locale)
	if (locale === "en") return en.registration_createaccount1(inputs)
	return da.registration_createaccount1(inputs)
};
export { registration_createaccount1 as "registration.createAccount" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const registration_creatingaccount1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.registration_creatingaccount1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("registration_creatingaccount1", locale)
	if (locale === "en") return en.registration_creatingaccount1(inputs)
	return da.registration_creatingaccount1(inputs)
};
export { registration_creatingaccount1 as "registration.creatingAccount" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const registration_webauthninfo2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.registration_webauthninfo2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("registration_webauthninfo2", locale)
	if (locale === "en") return en.registration_webauthninfo2(inputs)
	return da.registration_webauthninfo2(inputs)
};
export { registration_webauthninfo2 as "registration.webAuthnInfo" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const registration_successtitle1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.registration_successtitle1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("registration_successtitle1", locale)
	if (locale === "en") return en.registration_successtitle1(inputs)
	return da.registration_successtitle1(inputs)
};
export { registration_successtitle1 as "registration.successTitle" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ companyName: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const registration_successdescription1 = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.registration_successdescription1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("registration_successdescription1", locale)
	if (locale === "en") return en.registration_successdescription1(inputs)
	return da.registration_successdescription1(inputs)
};
export { registration_successdescription1 as "registration.successDescription" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const registration_successdescriptiongeneric2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.registration_successdescriptiongeneric2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("registration_successdescriptiongeneric2", locale)
	if (locale === "en") return en.registration_successdescriptiongeneric2(inputs)
	return da.registration_successdescriptiongeneric2(inputs)
};
export { registration_successdescriptiongeneric2 as "registration.successDescriptionGeneric" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const registration_successexplore1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.registration_successexplore1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("registration_successexplore1", locale)
	if (locale === "en") return en.registration_successexplore1(inputs)
	return da.registration_successexplore1(inputs)
};
export { registration_successexplore1 as "registration.successExplore" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const registration_welcomeemail1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.registration_welcomeemail1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("registration_welcomeemail1", locale)
	if (locale === "en") return en.registration_welcomeemail1(inputs)
	return da.registration_welcomeemail1(inputs)
};
export { registration_welcomeemail1 as "registration.welcomeEmail" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const registration_verifyemail1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.registration_verifyemail1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("registration_verifyemail1", locale)
	if (locale === "en") return en.registration_verifyemail1(inputs)
	return da.registration_verifyemail1(inputs)
};
export { registration_verifyemail1 as "registration.verifyEmail" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const registration_required = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.registration_required(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("registration_required", locale)
	if (locale === "en") return en.registration_required(inputs)
	return da.registration_required(inputs)
};
export { registration_required as "registration.required" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const terms_acceptrequired1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.terms_acceptrequired1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("terms_acceptrequired1", locale)
	if (locale === "en") return en.terms_acceptrequired1(inputs)
	return da.terms_acceptrequired1(inputs)
};
export { terms_acceptrequired1 as "terms.acceptRequired" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const privacy_acceptrequired1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.privacy_acceptrequired1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("privacy_acceptrequired1", locale)
	if (locale === "en") return en.privacy_acceptrequired1(inputs)
	return da.privacy_acceptrequired1(inputs)
};
export { privacy_acceptrequired1 as "privacy.acceptRequired" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ companyName: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const registration_terms = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.registration_terms(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("registration_terms", locale)
	if (locale === "en") return en.registration_terms(inputs)
	return da.registration_terms(inputs)
};
export { registration_terms as "registration.terms" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ companyName: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const registration_privacy = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.registration_privacy(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("registration_privacy", locale)
	if (locale === "en") return en.registration_privacy(inputs)
	return da.registration_privacy(inputs)
};
export { registration_privacy as "registration.privacy" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const registration_completing = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.registration_completing(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("registration_completing", locale)
	if (locale === "en") return en.registration_completing(inputs)
	return da.registration_completing(inputs)
};
export { registration_completing as "registration.completing" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const registration_termsservicerequired2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.registration_termsservicerequired2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("registration_termsservicerequired2", locale)
	if (locale === "en") return en.registration_termsservicerequired2(inputs)
	return da.registration_termsservicerequired2(inputs)
};
export { registration_termsservicerequired2 as "registration.termsServiceRequired" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const branding_securedby1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.branding_securedby1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("branding_securedby1", locale)
	if (locale === "en") return en.branding_securedby1(inputs)
	return da.branding_securedby1(inputs)
};
export { branding_securedby1 as "branding.securedBy" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const branding_poweredby1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.branding_poweredby1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("branding_poweredby1", locale)
	if (locale === "en") return en.branding_poweredby1(inputs)
	return da.branding_poweredby1(inputs)
};
export { branding_poweredby1 as "branding.poweredBy" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const time_minute = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.time_minute(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("time_minute", locale)
	if (locale === "en") return en.time_minute(inputs)
	return da.time_minute(inputs)
};
export { time_minute as "time.minute" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const time_minutes = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.time_minutes(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("time_minutes", locale)
	if (locale === "en") return en.time_minutes(inputs)
	return da.time_minutes(inputs)
};
export { time_minutes as "time.minutes" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const time_second = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.time_second(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("time_second", locale)
	if (locale === "en") return en.time_second(inputs)
	return da.time_second(inputs)
};
export { time_second as "time.second" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const time_seconds = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.time_seconds(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("time_seconds", locale)
	if (locale === "en") return en.time_seconds(inputs)
	return da.time_seconds(inputs)
};
export { time_seconds as "time.seconds" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const user_welcomeback1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.user_welcomeback1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("user_welcomeback1", locale)
	if (locale === "en") return en.user_welcomeback1(inputs)
	return da.user_welcomeback1(inputs)
};
export { user_welcomeback1 as "user.welcomeBack" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const user_signout1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.user_signout1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("user_signout1", locale)
	if (locale === "en") return en.user_signout1(inputs)
	return da.user_signout1(inputs)
};
export { user_signout1 as "user.signOut" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const user_security_title = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.user_security_title(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("user_security_title", locale)
	if (locale === "en") return en.user_security_title(inputs)
	return da.user_security_title(inputs)
};
export { user_security_title as "user.security.title" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const user_security_description = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.user_security_description(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("user_security_description", locale)
	if (locale === "en") return en.user_security_description(inputs)
	return da.user_security_description(inputs)
};
export { user_security_description as "user.security.description" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const user_security_managepasskeys1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.user_security_managepasskeys1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("user_security_managepasskeys1", locale)
	if (locale === "en") return en.user_security_managepasskeys1(inputs)
	return da.user_security_managepasskeys1(inputs)
};
export { user_security_managepasskeys1 as "user.security.managePasskeys" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const user_profile_title = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.user_profile_title(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("user_profile_title", locale)
	if (locale === "en") return en.user_profile_title(inputs)
	return da.user_profile_title(inputs)
};
export { user_profile_title as "user.profile.title" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const user_profile_description = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.user_profile_description(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("user_profile_description", locale)
	if (locale === "en") return en.user_profile_description(inputs)
	return da.user_profile_description(inputs)
};
export { user_profile_description as "user.profile.description" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const user_profile_editprofile1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.user_profile_editprofile1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("user_profile_editprofile1", locale)
	if (locale === "en") return en.user_profile_editprofile1(inputs)
	return da.user_profile_editprofile1(inputs)
};
export { user_profile_editprofile1 as "user.profile.editProfile" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const user_privacy_title = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.user_privacy_title(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("user_privacy_title", locale)
	if (locale === "en") return en.user_privacy_title(inputs)
	return da.user_privacy_title(inputs)
};
export { user_privacy_title as "user.privacy.title" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const user_privacy_description = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.user_privacy_description(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("user_privacy_description", locale)
	if (locale === "en") return en.user_privacy_description(inputs)
	return da.user_privacy_description(inputs)
};
export { user_privacy_description as "user.privacy.description" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const user_privacy_datapolicy1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.user_privacy_datapolicy1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("user_privacy_datapolicy1", locale)
	if (locale === "en") return en.user_privacy_datapolicy1(inputs)
	return da.user_privacy_datapolicy1(inputs)
};
export { user_privacy_datapolicy1 as "user.privacy.dataPolicy" }
/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "da" }} options
* @returns {string}
*/
/* @__NO_SIDE_EFFECTS__ */
const user_privacy_termsofservice2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.user_privacy_termsofservice2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("user_privacy_termsofservice2", locale)
	if (locale === "en") return en.user_privacy_termsofservice2(inputs)
	return da.user_privacy_termsofservice2(inputs)
};
export { user_privacy_termsofservice2 as "user.privacy.termsOfService" }
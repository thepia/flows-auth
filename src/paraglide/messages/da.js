/* eslint-disable */


export const email_label = /** @type {(inputs: {}) => string} */ () => {
	return `E-mail adresse`
};

export const email_placeholder = /** @type {(inputs: {}) => string} */ () => {
	return `din@email.dk`
};

export const email_invalid = /** @type {(inputs: {}) => string} */ () => {
	return `Indtast venligst en gyldig e-mail adresse`
};

export const email_required = /** @type {(inputs: {}) => string} */ () => {
	return `E-mail adresse er påkrævet`
};

export const form_signintitle2 = /** @type {(inputs: { companyName: NonNullable<unknown> }) => string} */ (i) => {
	return `Log ind på ${i.companyName}`
};

export const form_signindescription2 = /** @type {(inputs: { companyName: NonNullable<unknown> }) => string} */ (i) => {
	return `Brug din ${i.companyName} konto, eller opret en.`
};

export const form_signingeneric2 = /** @type {(inputs: {}) => string} */ () => {
	return `Log ind`
};

export const form_signingenericdescription3 = /** @type {(inputs: { companyName: NonNullable<unknown> }) => string} */ (i) => {
	return `Indtast din e-mail for at fortsætte til ${i.companyName}`
};

export const auth_signin1 = /** @type {(inputs: {}) => string} */ () => {
	return `Log ind`
};

export const auth_signinwithpasskey3 = /** @type {(inputs: {}) => string} */ () => {
	return `Log ind med Passkey`
};

export const auth_continuewithtouchid3 = /** @type {(inputs: {}) => string} */ () => {
	return `Fortsæt med Touch ID`
};

export const auth_continuewithfaceid3 = /** @type {(inputs: {}) => string} */ () => {
	return `Fortsæt med Face ID`
};

export const auth_continuewithbiometric2 = /** @type {(inputs: {}) => string} */ () => {
	return `Fortsæt med Touch ID/Face ID`
};

export const auth_continuewithtouchidfaceid5 = /** @type {(inputs: {}) => string} */ () => {
	return `Fortsæt med Touch ID/Face ID`
};

export const auth_sendpinbyemail3 = /** @type {(inputs: {}) => string} */ () => {
	return `Send pin via e-mail`
};

export const auth_sendpintoemail3 = /** @type {(inputs: {}) => string} */ () => {
	return `Send pin til e-mail`
};

export const auth_sendmagiclink2 = /** @type {(inputs: {}) => string} */ () => {
	return `Send Magisk Link`
};

export const auth_loading = /** @type {(inputs: {}) => string} */ () => {
	return `Indlæser...`
};

export const auth_signingin1 = /** @type {(inputs: {}) => string} */ () => {
	return `Logger ind...`
};

export const auth_sendingpin1 = /** @type {(inputs: {}) => string} */ () => {
	return `Sender pin...`
};

export const auth_sendingmagiclink2 = /** @type {(inputs: {}) => string} */ () => {
	return `Sender magisk link...`
};

export const auth_authenticating = /** @type {(inputs: {}) => string} */ () => {
	return `Godkender...`
};

export const code_label = /** @type {(inputs: {}) => string} */ () => {
	return `Indtast bekræftelseskode`
};

export const code_placeholder = /** @type {(inputs: {}) => string} */ () => {
	return `6-cifret kode`
};

export const code_invalid = /** @type {(inputs: {}) => string} */ () => {
	return `Indtast venligst en gyldig 6-cifret kode`
};

export const code_expired = /** @type {(inputs: {}) => string} */ () => {
	return `Bekræftelseskoden er udløbet`
};

export const code_incorrect = /** @type {(inputs: {}) => string} */ () => {
	return `Forkert bekræftelseskode`
};

export const code_verify = /** @type {(inputs: {}) => string} */ () => {
	return `Bekræft kode`
};

export const code_verifying = /** @type {(inputs: {}) => string} */ () => {
	return `Bekræfter...`
};

export const error_invalidcode1 = /** @type {(inputs: {}) => string} */ () => {
	return `Ugyldig eller udløbet kode. Måske har du en nyere kode.`
};

export const status_emailsent1 = /** @type {(inputs: {}) => string} */ () => {
	return `Vi sendte en bekræftelseskode via email`
};

export const status_checkemail1 = /** @type {(inputs: {}) => string} */ () => {
	return `Tjek din e-mail`
};

export const status_pinvalid1 = /** @type {(inputs: { minutes: NonNullable<unknown>, s: NonNullable<unknown> }) => string} */ (i) => {
	return `En gyldig pin blev allerede sendt til dig, gyldig i ${i.minutes} minut${i.s}.`
};

export const status_pindirectaction2 = /** @type {(inputs: {}) => string} */ () => {
	return `Indtast pin her`
};

export const status_pindetected1 = /** @type {(inputs: {}) => string} */ () => {
	return `Gyldig pin fundet`
};

export const status_signinsuccess2 = /** @type {(inputs: {}) => string} */ () => {
	return `Velkommen tilbage!`
};

export const status_magiclinksent2 = /** @type {(inputs: {}) => string} */ () => {
	return `Vi sendte et sikkert login link til`
};

export const error_network = /** @type {(inputs: {}) => string} */ () => {
	return `Netværksfejl.`
};

export const error_usernotfound2 = /** @type {(inputs: {}) => string} */ () => {
	return `Ingen konto fundet med denne e-mail adresse`
};

export const error_invalidcredentials1 = /** @type {(inputs: {}) => string} */ () => {
	return `Ugyldig e-mail eller godkendelse mislykkedes`
};

export const error_serviceunavailable1 = /** @type {(inputs: {}) => string} */ () => {
	return `Tjenesten er midlertidigt utilgængelig`
};

export const error_unknown = /** @type {(inputs: {}) => string} */ () => {
	return `Der opstod en uventet fejl`
};

export const error_ratelimited1 = /** @type {(inputs: {}) => string} */ () => {
	return `For mange forsøg.`
};

export const error_invalidinput1 = /** @type {(inputs: {}) => string} */ () => {
	return `Ugyldigt input.`
};

export const error_authcancelled1 = /** @type {(inputs: {}) => string} */ () => {
	return `Godkendelse annulleret.`
};

export const error_authfailed1 = /** @type {(inputs: {}) => string} */ () => {
	return `Godkendelse mislykkedes.`
};

export const error_magiclinkfailed2 = /** @type {(inputs: {}) => string} */ () => {
	return `Kunne ikke sende magisk link.`
};

export const error_noauthmethods2 = /** @type {(inputs: {}) => string} */ () => {
	return `Ingen godkendelsesmetoder tilgængelige for denne e-mail.`
};

export const error_nopasskeyfound2 = /** @type {(inputs: {}) => string} */ () => {
	return `Ingen passkey fundet for denne e-mail.`
};

export const error_passkeynotsupported2 = /** @type {(inputs: {}) => string} */ () => {
	return `Passkey godkendelse understøttes ikke på denne enhed.`
};

export const error_securityerror1 = /** @type {(inputs: {}) => string} */ () => {
	return `Sikkerhedsfejl opstod. Sørg venligst for at du er på en sikker forbindelse.`
};

export const error_nopasskeyavailable2 = /** @type {(inputs: {}) => string} */ () => {
	return `Ingen passkey tilgængelig på denne enhed.`
};

export const error_registrationfailed1 = /** @type {(inputs: {}) => string} */ () => {
	return `Registrering mislykkedes`
};

export const error_unknownerror1 = /** @type {(inputs: {}) => string} */ () => {
	return `Der opstod en uventet fejl.`
};

export const auth_onlyregisteredusers2 = /** @type {(inputs: {}) => string} */ () => {
	return `Kun registrerede brugere kan logge ind. Kontakt support hvis du har brug for adgang.`
};

export const auth_fullname1 = /** @type {(inputs: {}) => string} */ () => {
	return `Fulde Navn`
};

export const auth_fullnameplaceholder2 = /** @type {(inputs: {}) => string} */ () => {
	return `Indtast dit fulde navn`
};

export const auth_newusertermsnotice3 = /** @type {(inputs: {}) => string} */ () => {
	return `Som ny bruger skal du gennemgå og bekræfte servicevilkårene efter login via e-mail.`
};

export const auth_signedinsuccess2 = /** @type {(inputs: {}) => string} */ () => {
	return `Du er nu logget ind!`
};

export const webauthn_ready = /** @type {(inputs: {}) => string} */ () => {
	return `🔐 WebAuthn klar - Touch ID/Face ID vises automatisk`
};

export const webauthn_touchid1 = /** @type {(inputs: {}) => string} */ () => {
	return `Touch ID`
};

export const webauthn_faceid1 = /** @type {(inputs: {}) => string} */ () => {
	return `Face ID`
};

export const webauthn_cancelled = /** @type {(inputs: {}) => string} */ () => {
	return `Godkendelse annulleret`
};

export const webauthn_notsupported1 = /** @type {(inputs: {}) => string} */ () => {
	return `WebAuthn understøttes ikke på denne enhed`
};

export const security_passwordlessexplanation1 = /** @type {(inputs: { companyName: NonNullable<unknown> }) => string} */ (i) => {
	return `${i.companyName} bruger adgangskodeløs godkendelse med biometriske passkeys eller sikre e-mail links for øget sikkerhed og bekvemmelighed.`
};

export const security_passwordlessgeneric1 = /** @type {(inputs: {}) => string} */ () => {
	return `Adgangskodeløs godkendelse med biometriske passkeys eller sikre e-mail links for øget sikkerhed og bekvemmelighed.`
};

export const security_passwordlesswithpin2 = /** @type {(inputs: { companyName: NonNullable<unknown> }) => string} */ (i) => {
	return `${i.companyName} bruger adgangskodeløs godkendelse med biometriske passkeys eller sikre e-mail pins for øget sikkerhed og bekvemmelighed.`
};

export const security_passwordlesswithpingeneric3 = /** @type {(inputs: {}) => string} */ () => {
	return `Adgangskodeløs godkendelse med biometriske passkeys eller sikre e-mail pins for øget sikkerhed og bekvemmelighed.`
};

export const explainer_features_securepasskey1 = /** @type {(inputs: {}) => string} */ () => {
	return `Sikker passkey godkendelse`
};

export const explainer_features_privacycompliant1 = /** @type {(inputs: {}) => string} */ () => {
	return `Privatlivs-kompatibel adgang`
};

export const explainer_features_employeeverification1 = /** @type {(inputs: {}) => string} */ () => {
	return `Medarbejderverifikation påkrævet`
};

export const explainer_features_userverification1 = /** @type {(inputs: {}) => string} */ () => {
	return `Brugerverifikation påkrævet`
};

export const action_retry = /** @type {(inputs: {}) => string} */ () => {
	return `Prøv igen`
};

export const action_back = /** @type {(inputs: {}) => string} */ () => {
	return `Tilbage`
};

export const action_continue = /** @type {(inputs: {}) => string} */ () => {
	return `Fortsæt`
};

export const action_cancel = /** @type {(inputs: {}) => string} */ () => {
	return `Annuller`
};

export const action_usedifferentemail2 = /** @type {(inputs: {}) => string} */ () => {
	return `Brug en anden e-mail`
};

export const signin_title1 = /** @type {(inputs: {}) => string} */ () => {
	return `Log ind`
};

export const signin_subtitle1 = /** @type {(inputs: { companyName: NonNullable<unknown> }) => string} */ (i) => {
	return `Indtast din e-mail for at fortsætte til ${i.companyName}`
};

export const signin_subtitlegeneric2 = /** @type {(inputs: {}) => string} */ () => {
	return `Indtast din e-mail for at fortsætte til din konto`
};

export const signin_webauthnindicator3 = /** @type {(inputs: {}) => string} */ () => {
	return `🔐 WebAuthn klar - Touch ID/Face ID vises automatisk`
};

export const magiclink_title1 = /** @type {(inputs: {}) => string} */ () => {
	return `Tjek din e-mail`
};

export const magiclink_description1 = /** @type {(inputs: {}) => string} */ () => {
	return `Vi sendte et sikkert login link til`
};

export const magiclink_differentemail2 = /** @type {(inputs: {}) => string} */ () => {
	return `Brug en anden e-mail`
};

export const registration_termstitle1 = /** @type {(inputs: {}) => string} */ () => {
	return `Vilkår og Privatliv`
};

export const registration_termsdescription1 = /** @type {(inputs: {}) => string} */ () => {
	return `Gennemgå og accepter venligst vores vilkår for at oprette din konto`
};

export const registration_agreeterms1 = /** @type {(inputs: {}) => string} */ () => {
	return `Jeg accepterer`
};

export const registration_agreeprivacy1 = /** @type {(inputs: {}) => string} */ () => {
	return `Jeg accepterer`
};

export const registration_termslink1 = /** @type {(inputs: {}) => string} */ () => {
	return `Servicevilkår`
};

export const registration_privacylink1 = /** @type {(inputs: {}) => string} */ () => {
	return `Privatlivspolitik`
};

export const registration_createaccount1 = /** @type {(inputs: {}) => string} */ () => {
	return `Opret Konto`
};

export const registration_creatingaccount1 = /** @type {(inputs: {}) => string} */ () => {
	return `Opretter konto...`
};

export const registration_webauthninfo2 = /** @type {(inputs: {}) => string} */ () => {
	return `🔐 Din enhed vil bede om Touch ID, Face ID eller Windows Hello`
};

export const registration_successtitle1 = /** @type {(inputs: {}) => string} */ () => {
	return `Konto Oprettet!`
};

export const registration_successdescription1 = /** @type {(inputs: { companyName: NonNullable<unknown> }) => string} */ (i) => {
	return `Velkommen til ${i.companyName}!`
};

export const registration_successdescriptiongeneric2 = /** @type {(inputs: {}) => string} */ () => {
	return `Velkommen til vores platform!`
};

export const registration_successexplore1 = /** @type {(inputs: {}) => string} */ () => {
	return `Du kan nu udforske applikationen.`
};

export const registration_welcomeemail1 = /** @type {(inputs: {}) => string} */ () => {
	return `📧 Vi har sendt en velkomst e-mail til`
};

export const registration_verifyemail1 = /** @type {(inputs: {}) => string} */ () => {
	return `🔓 Bekræft din e-mail for at låse op for alle funktioner`
};

export const registration_required = /** @type {(inputs: {}) => string} */ () => {
	return `Registrering påkrævet. Fuldfør venligst registreringsprocessen.`
};

export const terms_acceptrequired1 = /** @type {(inputs: {}) => string} */ () => {
	return `Du skal acceptere Servicevilkår og Privatlivspolitik for at fortsætte.`
};

export const privacy_acceptrequired1 = /** @type {(inputs: {}) => string} */ () => {
	return `Du skal acceptere privatlivspolitikken`
};

export const registration_terms = /** @type {(inputs: { companyName: NonNullable<unknown> }) => string} */ (i) => {
	return `Jeg accepterer ${i.companyName}s Servicevilkår`
};

export const registration_privacy = /** @type {(inputs: { companyName: NonNullable<unknown> }) => string} */ (i) => {
	return `Jeg accepterer ${i.companyName}s Privatlivspolitik`
};

export const registration_completing = /** @type {(inputs: {}) => string} */ () => {
	return `Fuldfører registrering...`
};

export const registration_termsservicerequired2 = /** @type {(inputs: {}) => string} */ () => {
	return `Du skal acceptere Servicevilkårene`
};

export const branding_securedby1 = /** @type {(inputs: {}) => string} */ () => {
	return `Sikret af`
};

export const branding_poweredby1 = /** @type {(inputs: {}) => string} */ () => {
	return `Thepia`
};

export const time_minute = /** @type {(inputs: {}) => string} */ () => {
	return `minut`
};

export const time_minutes = /** @type {(inputs: {}) => string} */ () => {
	return `minutter`
};

export const time_second = /** @type {(inputs: {}) => string} */ () => {
	return `sekund`
};

export const time_seconds = /** @type {(inputs: {}) => string} */ () => {
	return `sekunder`
};

export const user_welcomeback1 = /** @type {(inputs: {}) => string} */ () => {
	return `Velkommen tilbage!`
};

export const user_signout1 = /** @type {(inputs: {}) => string} */ () => {
	return `Log ud`
};

export const user_security_title = /** @type {(inputs: {}) => string} */ () => {
	return `Sikkerhed`
};

export const user_security_description = /** @type {(inputs: {}) => string} */ () => {
	return `Administrer dine passkeys, godkendelsesmetoder og sikkerhedsindstillinger.`
};

export const user_security_managepasskeys1 = /** @type {(inputs: {}) => string} */ () => {
	return `Administrer Passkeys`
};

export const user_profile_title = /** @type {(inputs: {}) => string} */ () => {
	return `Profil`
};

export const user_profile_description = /** @type {(inputs: {}) => string} */ () => {
	return `Opdater dine personlige oplysninger og kontopræferencer.`
};

export const user_profile_editprofile1 = /** @type {(inputs: {}) => string} */ () => {
	return `Rediger profil`
};

export const user_privacy_title = /** @type {(inputs: {}) => string} */ () => {
	return `Privatliv og jura`
};

export const user_privacy_description = /** @type {(inputs: {}) => string} */ () => {
	return `Gennemgå datapolitikker, servicevilkår og privatlivsindstillinger.`
};

export const user_privacy_datapolicy1 = /** @type {(inputs: {}) => string} */ () => {
	return `Datapolitik`
};

export const user_privacy_termsofservice2 = /** @type {(inputs: {}) => string} */ () => {
	return `Servicevilkår`
};
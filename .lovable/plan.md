## Add Passkey (Biometric) Login

OTP stays as the signup + recovery method. After first OTP login, users can enroll a passkey on their device (Face ID / fingerprint / Windows Hello / device PIN). On return visits they tap "Sign in with biometrics" and the device unlocks the app — no email code needed.

### How it will work

```text
First-time user                     Returning user (enrolled)
───────────────                     ───────────────────────────
1. Enter email                      1. Tap "Sign in with biometrics"
2. Get OTP code                     2. Face ID / fingerprint prompt
3. Verify → logged in               3. Edge function verifies signature
4. Prompt: "Enable quick sign-in?"  4. Issued a Supabase session
5. Face ID / fingerprint enrolled   
                                    Fallback: "Use email code instead" → OTP flow
```

### Database (1 new table)

`user_passkeys`
- `id` uuid PK
- `user_id` uuid → profiles.id
- `credential_id` text unique (the WebAuthn credential ID)
- `public_key` bytea
- `counter` bigint
- `transports` text[]
- `device_label` text (e.g. "iPhone 15 — Safari")
- `created_at`, `last_used_at`
- RLS: users can read/delete only their own rows; inserts via edge function only.

Plus a small `webauthn_challenges` table (or short-lived in-memory map keyed by email) to hold the per-attempt challenge.

### Edge functions (4 new)

Using `@simplewebauthn/server` (Deno-compatible).

1. **`passkey-register-options`** — authed. Generates registration challenge, stores it, returns options to browser.
2. **`passkey-register-verify`** — authed. Verifies the attestation, saves credential to `user_passkeys`.
3. **`passkey-auth-options`** — public. Takes email, returns allowed credential IDs + challenge.
4. **`passkey-auth-verify`** — public. Verifies assertion, then uses service role to `admin.generateLink({ type: 'magiclink' })` and returns the session tokens to the client, which calls `supabase.auth.setSession(...)`.

### Frontend changes

- **`src/lib/passkeys.ts`** — wrappers around `navigator.credentials.create()` / `.get()` and the 4 edge functions. Feature-detect `window.PublicKeyCredential` and `isUserVerifyingPlatformAuthenticatorAvailable()`.
- **`src/pages/LoginPage.tsx`** — add a "Sign in with biometrics" button on the email step. On click: ask for email (or remember last-used email in localStorage), call auth-options → `navigator.credentials.get()` → auth-verify → set session → navigate. "Use email code instead" link always visible as fallback.
- **`src/components/PasskeyEnrollPrompt.tsx`** (new) — modal shown once after first successful OTP login if the device supports platform authenticator and user has no passkey yet. "Enable" / "Not now" / "Don't ask again" (stored on profile).
- **`src/pages/SettingsPage.tsx`** — new "Security" section listing enrolled devices with "Add this device" and "Remove" actions.
- **i18n** — add MS/EN strings for all new copy.
- **`profiles`** — add `passkey_prompt_dismissed boolean default false` so we don't nag.

### Caveats to know

- Per-device. New phone/browser → user falls back to OTP, then can enroll the new device.
- Requires HTTPS (preview + production already are).
- iOS: best inside the installed PWA; Safari tab also works on iOS 16+.
- The "email" entered on the biometric path is only used to look up allowed credentials — actual identity is proven by the signed challenge.

### Files touched

**New**
- `supabase/migrations/<ts>_passkeys.sql`
- `supabase/functions/passkey-register-options/index.ts`
- `supabase/functions/passkey-register-verify/index.ts`
- `supabase/functions/passkey-auth-options/index.ts`
- `supabase/functions/passkey-auth-verify/index.ts`
- `src/lib/passkeys.ts`
- `src/components/PasskeyEnrollPrompt.tsx`

**Edited**
- `src/pages/LoginPage.tsx` (biometric button + fallback link)
- `src/pages/SettingsPage.tsx` (Security section)
- `src/components/AppShell.tsx` (mount enroll prompt)
- `src/i18n/locales/en.json`, `ms.json`

Approve and I'll build it.

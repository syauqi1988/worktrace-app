

## Add "Install App" Banner

### What it does
Shows a dismissible banner/notification prompting users to install WorkTrace as a home screen app, each time they open the app — but only if:
- The app is NOT already installed (standalone mode)
- The user hasn't dismissed it in the current session
- The app is running on the published domain (not in Lovable preview/iframe)

No service worker or `vite-plugin-pwa` is needed — just a web app manifest for installability and a UI banner.

### Changes

**1. Create `public/manifest.json`**
- `name`: "WorkTrace", `short_name`: "WorkTrace"
- `display`: "standalone", `start_url`: "/", `theme_color` and `background_color` matching app branding
- Icons: reuse existing `/logo.svg` (+ generate a 192x192 and 512x512 PNG if needed, or use SVG with `purpose: "any"`)

**2. Update `index.html`**
- Add `<link rel="manifest" href="/manifest.json">`
- Add `<meta name="apple-mobile-web-app-capable" content="yes">` and related Apple meta tags for iOS

**3. Create `src/components/InstallPromptBanner.tsx`**
- Listens for the `beforeinstallprompt` event (Chrome/Android) and stores the event
- On Android: shows a banner with "Pasang WorkTrace" button that triggers the native install prompt
- On iOS (Safari): shows a banner explaining "Ketik Share → Add to Home Screen"
- Detects if already installed via `window.matchMedia('(display-mode: standalone)')` — if so, hides banner
- Dismiss stores flag in `sessionStorage` so it only shows once per session
- Skips rendering entirely if inside iframe or on preview domain

**4. Add banner to `AppShell.tsx`**
- Render `<InstallPromptBanner />` at the top of the layout, above the header

### Technical details
- No `vite-plugin-pwa` or service worker — keeps things simple and avoids preview issues
- The install prompt only works on HTTPS published domain, not in the Lovable editor
- iOS does not support `beforeinstallprompt`, so we show manual instructions for Safari users
- Banner language in Malay to match the app


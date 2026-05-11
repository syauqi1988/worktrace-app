## Goal
Reskin the app to match the WorkTrace brand summary and replace the logo with the uploaded `worktrace_logo_v2.svg`.

## Brand tokens (from attached summary)
- Background: `#F7F9FC` · Surface: `#FFFFFF` · Border: `#E2E8F4`
- Ink/foreground: `#0D1117` · muted `#5B6B8A` · faint `#8A97AF`
- Primary (blue): `#1B4FD8` · light `#EFF6FF` · mid `#BFDBFE`
- Accents: amber `#D97706`, green `#16A34A`, red `#DC2626`, purple `#7C3AED`
- Sidebar / dark surface: `#0D1117`
- Fonts: **Syne** (display/headings, 700–800), **DM Sans** (body), **JetBrains Mono** (numbers/labels)

## Changes

### 1. `src/index.css`
- Swap Google Fonts import to Syne + DM Sans + JetBrains Mono.
- Update HSL tokens under `:root` to brand palette:
  - `--background` → `#F7F9FC`, `--foreground` → `#0D1117`
  - `--card`, `--popover` → `#FFFFFF`
  - `--primary` → `#1B4FD8`, `--primary-foreground` white
  - `--secondary`, `--muted`, `--accent` → `#EFF6FF` / muted-fg `#5B6B8A`
  - `--border`, `--input` → `#E2E8F4`
  - `--ring` → `#1B4FD8`
  - `--destructive` → `#DC2626`, `--success` → `#16A34A`
  - `--navy` → `#0D1117` (sidebar dark)
  - `--sidebar-*` → dark sidebar variant (bg `#0D1117`, fg white, primary `#1B4FD8`, border `#1C2333`)
- Body font → `'DM Sans'`.

### 2. `tailwind.config.ts`
- `fontFamily.sans` → `['DM Sans', 'sans-serif']`
- Add `fontFamily.display` → `['Syne', 'sans-serif']` and `fontFamily.mono` → `['JetBrains Mono', 'monospace']` so headings/marketing surfaces can opt in via `font-display`.
- Add brand accent palette aliases (`amber`, `purple`) only if needed — defer unless we hit gaps.

### 3. Logo swap
- Copy `user-uploads://worktrace_logo_v2.svg` → `public/logo.svg` (replacing current; keeps every existing `/logo.svg` reference working — `index.html`, `manifest.json`, `AppShell`, login, PDFs, etc.).
- Also copy to `src/assets/logo.svg` for components importing from `@/assets/logo.svg`.
- Update `public/manifest.json` `theme_color` → `#1B4FD8` (already matches) and `background_color` → `#F7F9FC`.
- Update `index.html` no-op (favicon already `/logo.svg`).

### 4. Light typography polish (low-risk)
- Apply `font-display` (Syne) class to existing top-level page headings only if trivially in shared shell components (`AppShell` brand title, marketing/login hero). No layout restructuring — purely class additions.

## Out of scope
- No business-logic, route, or component-structure changes.
- No dark-mode pass (only sidebar uses dark surface, already covered via `--sidebar-*`).
- PDF styles (`pdfStyles.ts`) untouched — they use `Helvetica` and printed brand colors that already align.

## Verification
- Visit `/login`, dashboard, sidebar, settings — confirm new blue primary, lighter bg, dark sidebar, new logo renders.
- Check console for missing font / 404 on logo.
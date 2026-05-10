## Goal

You already have an admin panel in a separate app. This project just needs to **consume** the announcements created there and display them as a popup to logged-in users.

Good news: the consumer side is **already wired up** in this codebase. This plan verifies it end-to-end and adds small polish so it works cleanly with your external admin panel.

## What already exists

- `announcements` table + `announcement_reads` table (with RLS letting any authed user read active, non-expired rows).
- `useActiveAnnouncement` hook — fetches the latest active, unread, non-expired popup announcement.
- `AnnouncementModal` — renders title/body in EN/MS based on `i18n.language`, with severity icon, optional "Learn more" link, and dismiss (writes to `announcement_reads`).
- Modal is mounted globally inside `AppShell` so every authenticated page shows it.
- `publish_announcement(p_id)` RPC exists for fan-out to `notifications`.

## What this plan changes

Small consumer-side improvements only — no admin UI built here (it lives in your other app).

1. **Realtime updates** — subscribe to `announcements` INSERT/UPDATE so a freshly published announcement pops up without requiring a page refresh. Update `useActiveAnnouncement` to re-run `load()` on any insert/update event.

2. **Respect `published_at`** — current query orders by `published_at DESC` but doesn't filter future-dated rows. Add `.lte('published_at', now)` so scheduled announcements only appear once their publish time arrives.

3. **Severity styling polish** — extend `AnnouncementModal` so the header background tint matches severity (info/success/warning/critical), keeping it within design tokens (no hardcoded colors).

4. **Link handling** — current code uses `navigate(link)` which only works for internal paths. Detect external `http(s)://` links and open in a new tab instead.

5. **Empty-state safety** — when `seenIds` is empty the current `.not('id','in','()')` is skipped correctly; add a fallback `or` filter to ignore expired rows server-side instead of only client-side.

6. **Quick smoke test doc** — short note in `README.md` describing the row shape your external admin panel must insert (required columns, what `is_active` / `show_popup` / `expires_at` / `severity` mean) so the two apps stay aligned.

## Files touched

- `src/hooks/useActiveAnnouncement.ts` — realtime subscription, `published_at` filter, expiry filter.
- `src/components/AnnouncementModal.tsx` — severity styling, external link handling.
- `README.md` — short "Announcements contract" section.

## Out of scope

- No admin form/page in this app (you build that in your separate admin app).
- No schema changes — the table already supports everything needed.
- No changes to `publish_announcement` RPC.

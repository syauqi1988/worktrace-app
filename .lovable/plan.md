# Announcements (admin-managed, bilingual)

Admin posts an announcement once → every active user sees a pop-up on next app load AND gets a row in their notification bell. Title/body stored in both MS and EN; user sees the language they've selected (`i18n.language`).

## 1. Database (migration in this project)

### New table: `announcements`
- `id uuid pk default gen_random_uuid()`
- `title_ms text not null`, `title_en text not null`
- `body_ms text`, `body_en text`
- `link text` (optional CTA, e.g. `/settings`)
- `severity text default 'info'` (`info` | `success` | `warning`)
- `is_active bool default true`
- `show_popup bool default true` (if false → notification only, no modal)
- `published_at timestamptz default now()`
- `expires_at timestamptz` (nullable)
- `created_by uuid`, `created_at`, `updated_at`

RLS:
- `SELECT`: any authenticated user where `is_active = true AND (expires_at IS NULL OR expires_at > now())` — OR `is_admin()`
- `ALL`: `is_admin()` (full CRUD for admin app)

### New table: `announcement_reads`
Tracks per-user dismissal of the pop-up so it doesn't re-show.
- `announcement_id uuid`, `user_id uuid`, `seen_at timestamptz default now()`
- PK (announcement_id, user_id)
- RLS: user can insert/select own rows.

### RPC: `publish_announcement(p_id uuid)` (SECURITY DEFINER, admin only)
Fans out a row into `notifications` for every active user (excluding deleted/cancelled), using MS or EN copy based on each user's `profiles` (we don't store user lang server-side → store BOTH languages in the notification body as JSON, see below). Simpler approach: insert one notification per user with `body = title_ms || ' | ' || title_en` is ugly. Instead:

**Cleaner:** Add `i18n` jsonb column to `notifications` (`{title:{ms,en}, body:{ms,en}}`). When present, the bell renders the language-specific copy; otherwise falls back to `title`/`body`. The RPC populates both `title`/`body` (MS as default for backwards compat) and `i18n`.

Notification `type = 'announcement'`, `link = announcements.link`, `ref_id = announcement.id`.

## 2. User-facing app (this project)

### `src/hooks/useActiveAnnouncement.ts`
- Queries `announcements` for the latest active row not yet in `announcement_reads` for the current user.
- Returns `{ announcement, dismiss() }` where `dismiss` inserts into `announcement_reads`.

### `src/components/AnnouncementModal.tsx`
- Mounted in `AppShell`. If hook returns an announcement with `show_popup`, render a Dialog with severity-styled header, localized title/body (`i18n.language === 'en' ? title_en : title_ms`), optional CTA button → navigate to `link`, and "Dismiss" closing the modal + calling `dismiss()`.

### `src/hooks/useNotifications.ts` + `NotificationBell.tsx`
- Extend `AppNotification` type with optional `i18n` field.
- In `NotificationBell`, when rendering an item, prefer `i18n[lang].title` / `i18n[lang].body` if present.
- Add `'announcement'` icon case (Megaphone).

## 3. Admin app (`admin.worktrace.my`, separate codebase)

Provide drop-in code for a new page `/admin/announcements`:
- `useAnnouncements` (list query)
- `useUpsertAnnouncement` (insert/update)
- `usePublishAnnouncement` (calls RPC → fans out notifications)
- `AnnouncementsPage.tsx`: table + form (title/body MS+EN, severity, link, show_popup, is_active, expires_at) + "Publish to all users" button per row.

Add link in admin sidebar near "Harga & Pelan".

## 4. i18n keys (MS/EN)
Add to `src/i18n/locales/{ms,en}.json`:
- `announcement.dismiss` ("Tutup" / "Dismiss")
- `announcement.viewMore` ("Lihat lagi" / "Learn more")
- `notifications.types.announcement` ("Pengumuman" / "Announcement")

## Files

This project:
- migration: create `announcements`, `announcement_reads`, add `notifications.i18n jsonb`, add `publish_announcement` RPC, RLS policies
- new: `src/hooks/useActiveAnnouncement.ts`, `src/components/AnnouncementModal.tsx`
- edit: `src/components/AppShell.tsx` (mount modal), `src/hooks/useNotifications.ts` (i18n field), `src/components/NotificationBell.tsx` (localized render + megaphone icon), `src/i18n/locales/{ms,en}.json`

Admin app (delivered as paste-in code):
- `src/features/announcements/{hooks,AnnouncementsPage.tsx,AnnouncementForm.tsx}`
- sidebar link snippet

## Notes
- Pop-up shows only once per user per announcement (tracked in `announcement_reads`).
- If admin sets `show_popup=false`, users only get the bell notification (silent broadcast).
- `expires_at` lets the modal/bell auto-hide stale announcements.
- Fan-out is a single RPC call; for very large user bases this is a synchronous insert — fine up to ~100k rows. Can be moved to an edge function later if needed.

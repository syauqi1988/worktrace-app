# Welcome to your Lovable project

TODO: Document your project here

## Announcements (popup)

Announcements are managed in a separate admin app and consumed here via a global popup (`AnnouncementModal` mounted in `AppShell`).

### Row contract — `public.announcements`

The admin app should insert rows with these columns:

| Column         | Required | Notes                                                                 |
| -------------- | -------- | --------------------------------------------------------------------- |
| `title_ms`     | yes      | Title in Bahasa Malaysia                                              |
| `title_en`     | yes      | Title in English                                                      |
| `body_ms`      | no       | Body in BM (supports line breaks)                                     |
| `body_en`      | no       | Body in EN (supports line breaks)                                     |
| `link`         | no       | Internal path (`/jobs/123`) opens in-app, external `https://…` opens in a new tab |
| `severity`     | yes      | `info` \| `success` \| `warning` \| `critical` (controls icon + accent bar) |
| `is_active`    | yes      | Master on/off switch                                                  |
| `show_popup`   | yes      | If false, the row is ignored by the popup (still usable via notifications) |
| `published_at` | yes      | Future timestamps are scheduled — popup waits until this time         |
| `expires_at`   | no       | After this time the popup stops showing                               |

### Display rules

- Only authenticated users see the popup.
- Each user only sees a given announcement once — dismiss writes to `announcement_reads`.
- New rows appear in real time (Postgres realtime subscription) — no refresh needed.
- Latest unread, active, non-expired, already-published row is shown.

### Optional: fan-out to notifications

Call the existing `publish_announcement(p_id uuid)` RPC from the admin app to also create a row in `public.notifications` for every active user (in addition to the popup).

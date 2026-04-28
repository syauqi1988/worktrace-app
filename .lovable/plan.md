## Goal

Build an in-app notification system with a bell icon dropdown in the header, plus device-level web push so users get notified about important events even when the app isn't open.

## Events that create a notification

1. **Customer approves a document** (Quotation / Invoice / Work Order / Completion Report) — via `customer_approvals.action = 'accepted'`
2. **Customer rejects a document** — `customer_approvals.action = 'rejected'`
3. **Customer submits payment proof** — `payment_proofs.submitted_at IS NOT NULL`
4. **Admin replies to a support ticket** — new row in `ticket_replies` with `sender_type = 'admin'`

## Database

New table `notifications`:

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid | owner who receives it |
| type | text | `approval_accepted`, `approval_rejected`, `payment_proof`, `ticket_reply` |
| title | text | short headline (Malay) |
| body | text | one-line detail |
| link | text | in-app route to open on click |
| ref_id | uuid | source row id (approval/proof/ticket) |
| read_at | timestamptz null | |
| created_at | timestamptz default now() | |

RLS: owner can SELECT/UPDATE own rows; INSERT allowed by service role / DB triggers.

New table `push_subscriptions`:

| column | type |
|---|---|
| id, user_id, endpoint (unique), p256dh, auth, user_agent, created_at |

RLS: user manages own rows.

### DB triggers (auto-create notifications)

- `customer_approvals` AFTER UPDATE → when `action` changes from NULL to `accepted`/`rejected`, insert a `notifications` row for `user_id` and call edge function `send-push` via `pg_net`.
- `payment_proofs` AFTER UPDATE → when `submitted_at` becomes non-null, same.
- `ticket_replies` AFTER INSERT → when `sender_type = 'admin'`, look up `support_tickets.user_id`, insert notification + push.

## Frontend

### Bell dropdown in `AppShell` header
- New `<NotificationBell />` next to the support / help buttons.
- Shows unread count badge (red dot with number).
- Click → dropdown panel listing latest 20 notifications, newest first.
- Each item: icon by type, title, body, relative time, click navigates to `link` and marks as read.
- "Tandakan semua sebagai dibaca" action at top.
- Realtime: subscribe to `notifications` inserts via Supabase Realtime so the bell updates live.

### Push subscription flow
- New hook `usePushNotifications()` registers a service worker (`/sw.js`) and asks for permission on first visit to Settings (or via a "Enable notifications" button in the new Settings tutorial).
- On grant, call `pushManager.subscribe()` with VAPID public key, store in `push_subscriptions`.
- Show toggle in Settings → "Notifikasi Peranti" so user can enable/disable.

### Service worker
- `public/sw.js` — handles `push` event, shows native OS notification with title + body, click opens the link.

## Edge function: `send-push`

- Triggered by DB trigger via `pg_net` after a notification row is inserted (or called from a trigger function).
- Reads all `push_subscriptions` for the recipient `user_id`.
- Sends Web Push using VAPID keys (`web-push` Deno port).
- Removes subscriptions that return 410/404 (expired).

### Required secrets (will be added)
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (e.g. `mailto:support@worktrace.app`)

The user will be asked to confirm generation; we generate keys and store them as Supabase secrets. Public key is also exposed via a small public edge function or hard-coded in client config.

## Files to create

- `supabase/migrations/<ts>_notifications.sql` — tables, RLS, triggers, trigger functions
- `supabase/functions/send-push/index.ts`
- `src/components/NotificationBell.tsx`
- `src/hooks/useNotifications.ts` (fetch + realtime + mark read)
- `src/hooks/usePushNotifications.ts`
- `src/components/settings/NotificationSettingsSection.tsx` (toggle in Settings accordion)
- `public/sw.js`

## Files to edit

- `src/components/AppShell.tsx` — mount `<NotificationBell />` in header
- `src/components/settings/SettingsAccordion.tsx` — add Notifications section
- `src/main.tsx` — register service worker (production only, guarded against iframe/preview per Lovable PWA rules)
- `src/integrations/supabase/types.ts` — auto-regenerated after migration

## Behavior summary

- Customer accepts/rejects a quote → owner instantly sees red dot on bell + (if enabled) a system push notification on phone/desktop. Clicking opens that document.
- Admin replies to ticket → same flow, opens that ticket.
- All notifications persist; user can browse history in the dropdown.
- Push works even when the app is closed (PWA installed) or the tab is in background (desktop) — standard Web Push behavior. iOS requires the app to be added to Home Screen first.

## Out of scope

- Email notifications (already handled separately for tickets).
- Native iOS/Android app push (would require Capacitor — can be added later).
# Reminder System Testing Checklist

This checklist verifies the real cron route and email reminder behavior without changing production code paths.

## Setup

Use two real recipients or plus-address aliases if you want inbox-level isolation.

```bash
export REMINDER_TEST_USER_A_EMAIL="reminder-user-a@example.com"
export REMINDER_TEST_USER_A_NOTIFY_EMAIL="your-email+tenant-a@example.com"
export REMINDER_TEST_USER_B_EMAIL="reminder-user-b@example.com"
export REMINDER_TEST_USER_B_NOTIFY_EMAIL="your-email+tenant-b@example.com"
```

Required `.env` values:

```bash
DATABASE_URL="..."
EMAIL_PROVIDER="gmail"
GMAIL_USER="youraddress@gmail.com"
GMAIL_APP_PASSWORD="your-google-app-password"
CRON_SECRET="..."
```

Use `EMAIL_PROVIDER=resend` with `RESEND_API_KEY` and `RESEND_FROM_EMAIL` when
testing the production Resend path.

## 1. Seed Real-World Scenarios

```bash
npm run reminders:test:seed
```

Expected output:

```json
{
  "tenantA": {
    "organization": "eg-reminder-test-tenant-a",
    "scenarios": ["30-day", "14-day", "7-day", "3-day", "1-day", "expired"]
  },
  "tenantB": {
    "organization": "eg-reminder-test-tenant-b",
    "scenarios": ["1-day"]
  }
}
```

This creates:

- Tenant A: expiring in 30 days, 14 days, 7 days, 3 days, tomorrow, and expired yesterday.
- Tenant B: expiring tomorrow.
- Separate users and organizations.
- `notificationEmail` overrides for both users.

## 2. Start Local App

```bash
npm run dev
```

Expected output includes:

```text
Local: http://localhost:3000
```

## 3. Run Cron Once

In another terminal:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/check-expiry
```

Expected output:

```json
{"ok":true,"sent":7,"skipped":0,"failed":0}
```

This verifies:

- Expiring tomorrow sends one email.
- 3-day reminders work.
- Seven-day reminders work.
- 14-day reminders work.
- 30-day reminders work.
- Expired reminders work.
- Tenant A and Tenant B reminders are processed separately.
- `notificationEmail` receives the email instead of the authenticated email.

## 4. Run Cron Again

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/check-expiry
```

Expected output:

```json
{"ok":true,"sent":0,"skipped":7,"failed":0}
```

This verifies duplicate prevention. The second cron run should not send duplicate reminder emails because `NotificationLog` already has `SENT` entries for the same `documentId + userId + reminderKey`.

## 5. Inspect Logs and Isolation

```bash
npm run reminders:test:inspect
```

Expected output:

```json
{
  "totals": {
    "sentLogs": 7,
    "failedLogs": 0,
    "crossTenantLeaks": 0,
    "duplicateOrMissingFailures": 0
  },
  "pass": true
}
```

This verifies:

- User A has exactly one 30-day, 14-day, 7-day, 3-day, 1-day, and expired reminder.
- User B has exactly one 1-day reminder.
- User A never receives User B notifications.
- User B never receives User A notifications.
- Notification email overrides were used.
- No duplicate `SENT` logs exist.

## 6. Alert Center and Badge Verification

The alert center and notification badge are computed from documents, not from `NotificationLog`.

Manual check:

1. Sign in as the seeded user or inspect with Prisma Studio.
2. Open `/dashboard/reminders`.
3. Confirm the seeded expiring/expired documents appear.
4. Confirm the header notification badge count matches unread active alerts.
5. Mark alerts as read.
6. Confirm the badge count decreases.

Expected behavior:

- Cron execution creates email logs only.
- Alert center remains based on document expiry state.
- Badges update after route refresh or read-state changes.

## 7. Reset Logs and Re-Test

```bash
npm run reminders:test:reset
```

Expected output:

```text
Deleted 4 reminder test notification logs.
```

Then rerun cron:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/check-expiry
```

Expected output:

```json
{"ok":true,"sent":7,"skipped":0,"failed":0}
```

## 8. Optional Daily Expired Reminder Test

Default behavior is send-once for expired reminders. To test the optional daily mode:

```bash
npm run reminders:test:seed-daily-expired
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/check-expiry
```

Expected first output:

```json
{"ok":true,"sent":7,"skipped":0,"failed":0}
```

Expected second output on the same day:

```json
{"ok":true,"sent":0,"skipped":7,"failed":0}
```

To simulate the next day locally for expired reminders only:

```bash
npm run reminders:test:simulate-next-expired-day
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/check-expiry
```

Expected output:

```json
{"ok":true,"sent":1,"skipped":6,"failed":0}
```

This proves daily expired reminders still send exactly once per calendar day.

## 9. Cleanup

```bash
npm run reminders:test:cleanup
```

Expected output:

```text
Cleaned reminder test data.
```

## Scenario Matrix

- 30-day reminders work: pass when inspect shows Tenant A `REMINDER_30` sent once.
- 14-day reminders work: pass when inspect shows Tenant A `REMINDER_14` sent once.
- 7-day reminders work: pass when inspect shows Tenant A `REMINDER_7` sent once.
- 3-day reminders work: pass when inspect shows Tenant A `REMINDER_3` sent once.
- Expiring tomorrow sends one email: pass when inspect shows `REMINDER_1` once per tenant.
- Running cron twice does not duplicate: pass when second cron has `sent: 0`.
- Expired reminders work: pass when inspect shows Tenant A `REMINDER_EXPIRED` sent once.
- Daily expired reminders work: pass when `simulate-next-expired-day` followed by cron sends exactly one additional expired email.
- Multi-tenant isolation works: pass when `crossTenantLeaks: 0`.
- User A never receives User B notifications: pass when Tenant B logs use only User B recipient.
- Notification email override works: pass when logs use `notificationEmail`, not user account email.
- Alert center updates: pass when seeded expiring documents appear in `/dashboard/reminders`.
- Notification badges update: pass when unread badge reflects active unread alerts and decreases after marking read.

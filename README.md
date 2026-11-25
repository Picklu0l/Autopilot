# Autopilot · Biswajit Power Hub

A mobile-first customer, EMI, service and follow-up manager for the Berhampore electric scooter dealership. The app uses Next.js App Router, TypeScript, Tailwind and Supabase. WhatsApp reminders open as `wa.me` links; there is no WhatsApp API integration.

## Phase 1 — project and database

1. Create a Supabase project and copy its project URL and anon key into `.env.local` using `.env.example` as a guide. Keep the service role key server-side only.
2. Apply the tracked database migrations with `npx supabase db push --remote`. This creates the schema and inserts the bilingual starter templates.
3. Create the single owner account in Supabase Auth (Dashboard → Authentication → Users → Add user). Disable public signups in Auth settings.
4. Copy that account’s UUID and run `update public.settings set owner_user_id = 'OWNER-UUID' where id = true;`. The RLS policies permit data access only to this authenticated owner.
5. Install packages with `npm install`, then start locally with `npm run dev`.

The Supabase project reference is stored in `supabase/config.toml`. After installing and signing in to the Supabase CLI, run `supabase link --project-ref jhdfmquhbpljelzqukld` then `supabase db push --remote`.

## Phase 2 — customer and reminder workflows

The dashboard and customer screens use the Supabase tables directly. Add Delivery writes the customer, three free service slots, two first-contact reminders, and the optional loan. The daily Edge Function builds EMI installments and adds due reminders. Import is CSV paste based; customer email is optional in the schema and can be populated through CSV.

Deploy the `generate-reminders` function:

```sh
supabase functions deploy generate-reminders
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

The function uses Supabase’s project URL and service role key. Run it once manually after deployment to verify setup.

## Phase 3 — messages, settings and hosting

1. Set Vercel project environment variables from `.env.example`, including a long random `CRON_SECRET`. Vercel Cron calls `/api/cron/reminders` every day at 04:30 UTC (10:00 AM India time). Vercel adds the matching `Authorization: Bearer <CRON_SECRET>` header.
2. For email, enable 2-Step Verification on the shop Gmail account, create an App Password under Google Account → Security → App passwords, and set `GMAIL_USER` and `GMAIL_APP_PASSWORD` in Vercel. Do not use the normal Gmail password.
3. Connect the Git repository to Vercel and deploy. Vercel’s free tier supports this app and one daily cron job on eligible plans.
4. Add customer email addresses to enable email reminders. No email is sent if the record has no address. WhatsApp remains a manual click-through and must be marked sent/done in the app.

## Important operating notes

- `/login` is for the pre-created owner account; there is no signup flow.
- `settings.owner_user_id` must be set before RLS will return any records.
- The Vercel cron is set to 10:00 AM India time. If you change that setting, also update the UTC schedule in `vercel.json` (India is UTC+05:30).
- Reminder rows are stored and displayed from `reminders`; the UI does not create recurring schedules in render code.
- The app uses INR formatting and Indian phone dialing links. Check mobile and laptop layouts before daily use.
- Appointment records are included in the database for the planned Phase 2 booking expansion.
- Supabase Storage is not required for the current feature set; no customer document uploads are enabled.

## Available scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm start` — serve a production build

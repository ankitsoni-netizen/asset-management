# Cloutflow Asset Desk

Internal dashboard for inventory, employee roster, and asset–employee mapping. Run it locally on this machine. Do not deploy it to Vercel.

## How it works

1. Admin signs in with email and password as `admin@cloutflow.com` only, using Supabase Auth.
2. **Assets** is inventory only. Scan the QR already printed on a device (or type that UID) and save the device. No UID or QR is generated here, and employee names are not shown.
3. **Employees** is the roster only. Add people with name, email, department, position, and optional employee ID. Asset details are not shown here.
4. **Allocation** is the mapping. Choose an available inventory asset and the employee it should be assigned to. To give that device to someone else, remove it first so it becomes **available**, then attach it again. There is no reallocation shortcut.
5. **QR codes** prints labels. Each code contains a unique UID. Stick it on a device, then add that UID under Assets.
6. Looking up a UID opens the inventory record after admin sign-in.

## Local setup

1. Copy `.env.example` to `.env.local` and set the Supabase URL plus the publishable/anon key. Keep `APP_URL=http://localhost:3100`. Do not add an admin password, Google OAuth secrets, or a service-role key for dashboard use.
2. Apply the database schema to the linked Supabase project (or a local Supabase stack):

```bash
npm install
npx supabase db push
```

To run Postgres on this machine instead of a hosted project:

```bash
npx supabase start
npx supabase db push
```

3. In the Supabase dashboard (or local Studio), create **only** the Auth user `admin@cloutflow.com` with email-and-password. Disable public sign-up. Do not enable Google or any other OAuth provider.
4. Start the app locally:

```bash
npm run dev
```

Open [http://localhost:3100](http://localhost:3100) and sign in as `admin@cloutflow.com`. The password lives only in Supabase Auth.

To send allocation emails, add SMTP settings in `.env.local`. Without SMTP, mappings still complete.

Do not run `vercel` or connect this app to a Vercel project. Production for this desk is `npm run dev` or `npm run build && npm start` on localhost port 3100.

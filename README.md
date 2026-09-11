# Cloutflow Asset Desk

Internal dashboard for recording, allocating, and tracking company assets issued to Cloutflow employees.

## What it does

1. Admin signs in with email and password as `admin@cloutflow.com` only.
2. An asset type is selected (laptop, mouse, keyboard, hard disk, and others) or a custom type is created.
3. Employee name, department, position, and official email are entered.
4. Images of the allocated asset are uploaded.
5. **Allocate** generates a unique UID (`CF-XXXX-XXXX`) and a QR code.
6. An acknowledgement email is sent to the employee using the Cloutflow office template (no taglines).
7. Scanning the QR or looking up the UID opens the admin record after admin sign-in.
8. Reallocation is available only on that record, after confirmation. The same UID moves to the new employee.
9. The allocation log lists every event, allocated or not, with dates, images, and filters.

## Setup

```bash
npm install
npx prisma db push
npm run db:seed
```

Sign in with:

```
Email: admin@cloutflow.com
Password: admin@cloutflow.123123
```

These values live in `.env` as `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

To send allocation emails, add SMTP settings in `.env`. Without SMTP, allocations still complete and the UID/QR are generated.

```bash
npm run dev
```

Open [http://localhost:3100](http://localhost:3100) and sign in with the admin email and password.

## Print labels

After allocation, open **Print UID and QR**. Print the sheet and apply the UID to the device.

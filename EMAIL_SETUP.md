# Email setup (assignment notifications)

Assignment emails (when a task is assigned to a user) require SMTP environment variables to be set.

## Required variables

- **`EMAIL_USER`** – SMTP login (e.g. your Gmail address).
- **`EMAIL_PASSWORD`** – SMTP password. For Gmail with 2FA you must use an [App Password](https://support.google.com/accounts/answer/185833), not your normal account password.

## Optional

- **`EMAIL_FROM`** – Sender address shown in emails (defaults to `EMAIL_USER`).
- **`EMAIL_HOST`** – SMTP host (default: `smtp.gmail.com`).
- **`EMAIL_PORT`** – SMTP port (default: `587`).
- **`EMAIL_SECURE`** – Set to `true` for port 465.

## Vercel

Set `EMAIL_USER` and `EMAIL_PASSWORD` in the Vercel project **Environment Variables**. If they are not set, assignment emails are skipped and a log message is written:  
`Assignment email skipped: EMAIL_USER not set. Set EMAIL_USER and EMAIL_PASSWORD in Vercel env to enable.`

## Gmail

If you use Gmail with two-factor authentication, create an App Password and use it as `EMAIL_PASSWORD`; the regular account password will not work.

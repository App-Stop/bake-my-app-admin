# Bake My App admin

React admin panel using the admin API. The dashboard, leads, subscriptions and onboarding, plans, staff and invitations, audit log, and email log use server data and staff permissions.

## Run locally

1. Copy `.env.example` to `.env.local` and set `VITE_ADMIN_API_URL` to the backend address (without `/v1/admin`).
2. Run `npm install`, then `npm run dev`.
3. Open `http://localhost:5174` and sign in with a staff account.

The backend must allow the panel origin through `ADMIN_CORS_ORIGINS`. A remote API used from localhost also needs `ADMIN_COOKIE_SAME_SITE=none`. Access tokens stay in memory; refresh uses the HttpOnly cookie.

The former `/bakeries` route opens subscriptions. List filters and pagination are saved in the URL; lead, subscription, and staff details have their own routes.

## Verify

- `npm run build` creates the production app.
- `npm test` checks authenticated requests, concurrent refresh, expired sessions, validation errors, and CSV export.
- `npm run test:ui` runs Chromium smoke tests with mocked API responses. It checks dashboard metrics, filters and paging, lead edits and notes, onboarding confirmations, staff management, invitations, logs, permissions, and mobile layout. Chrome and Edge are detected on Windows; set `CHROME_PATH` for another installation. Set `QA_SCREENSHOTS` to a directory to capture screenshots.

The automated checks never call a live admin backend. A real staff account and a correctly configured backend are needed to validate deployed cookies, CORS, and live responses.

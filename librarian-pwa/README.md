# Smart Library Librarian PWA

Next.js 14 App Router admin application for library staff. It uses a light, flat interface with the shared Smart Library colours.

## Run locally

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL`.
2. Run `npm install` then `npm run dev`.
3. Visit `/login`. The backend librarian login endpoint must return `{ token, user? }` (or `{ token, role }`).

Protected pages consume `/api/admin/inventory`, `/api/admin/users`, `/api/admin/transactions`, `/api/admin/holds`, and `/api/admin/reports/overdue`. List responses may use either a plain array or the shared `{ data, total, page, limit }` envelope.

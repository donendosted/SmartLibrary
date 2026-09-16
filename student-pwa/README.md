# Smart Library Student PWA

Next.js 14 App Router PWA for students. It uses a light, flat design system with the shared API contract expected at `NEXT_PUBLIC_API_URL`.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

The application stores the JWT as `library_token` in local storage and sends it as a Bearer token. Protected routes redirect to `/login` without a token. When the API cannot be reached, discovery/dashboard pages show clearly marked sample data so the UI remains reviewable.

## API contract consumed

- `POST /auth/register`, `POST /auth/login`
- `GET /api/student/profile`, `GET /api/student/books`
- `GET /api/books/search?q=`, `GET /api/books/:id`
- `POST /api/student/hold`, `GET /api/student/holds`, `POST /api/student/extend`
- `GET /api/notifications`

Responses may be direct JSON or `{ data: ... }`; errors use `{ error, code }`.

## PWA

`public/manifest.json` defines the install metadata and `public/sw.js` caches successfully visited GET routes with an offline page fallback. Deploy to Vercel with `NEXT_PUBLIC_API_URL` set to the backend URL.

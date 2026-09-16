# Smart Library Frontend

Unified Next.js PWA for students and librarians.

- Student routes: `/`, `/login`, `/register`, `/books`, `/my-books`, `/holds`, `/notifications`, `/account`.
- Librarian login: `/librarian-login`.
- Protected librarian routes: `/admin/*`.

Run locally:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_API_URL` to the backend URL. Librarian access requires a backend-issued non-`student` role; admin API endpoints independently enforce the JWT role even if a client attempts to forge the browser session marker.

To obtain librarian credentials locally, run `npm run seed:librarian -- admin` from `backend/`; the backend prints a one-time generated password. Use that username and password at `/librarian-login`. Never commit credentials or put them in frontend source code.

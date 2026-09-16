# Smart Library MVP

Smart Library is a three-application monorepo:

- `backend` — Express API backed by MongoDB
- `student-pwa` — student-facing Next.js PWA
- `librarian-pwa` — librarian-facing Next.js PWA

## Run locally

Each project has its own setup instructions and `.env.example`. Start MongoDB (or configure MongoDB Atlas), set `backend/MONGODB_URI`, start the API, then start either PWA with `NEXT_PUBLIC_API_URL=http://localhost:4000`.

## Deployment targets

Create three projects from this repository:

| Application | Platform | Root directory |
| --- | --- | --- |
| API | Render Web Service | `backend` |
| Student PWA | Vercel | `student-pwa` |
| Librarian PWA | Vercel | `librarian-pwa` |

Set each PWA's `NEXT_PUBLIC_API_URL` to the Render API URL and set `CORS_ORIGINS` in the API to the deployed PWA origins.

See [API contract](docs/api-contract.md) for endpoint and authentication conventions.

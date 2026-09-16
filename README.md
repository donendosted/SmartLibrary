# Smart Library MVP

Smart Library is a monorepo with one API and one unified frontend:

- `backend` — Express API backed by MongoDB
- `frontend` — unified Next.js PWA (`/` for students and `/admin` for librarians)

## Run locally

Each project has its own setup instructions and `.env.example`. Start MongoDB (or configure MongoDB Atlas), set `backend/MONGODB_URI`, start the API, then start `frontend` with `NEXT_PUBLIC_API_URL=http://localhost:4000`.

## Deployment targets

Create two projects from this repository:

| Application   | Platform           | Root directory  |
| ------------- | ------------------ | --------------- |
| API           | Render Web Service | `backend`       |
| Unified PWA   | Vercel             | `frontend`      |

Set `NEXT_PUBLIC_API_URL` in `frontend` to the Render API URL and set `CORS_ORIGINS` in the API to the deployed frontend origin.

See [API contract](docs/api-contract.md) for endpoint and authentication conventions.

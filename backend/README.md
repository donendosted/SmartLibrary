# Smart Library API

Express + PostgreSQL backend for the Smart Library MVP. Requires Node 20+ and PostgreSQL 14+.

## Run locally

1. Copy `.env.example` to `.env` and set `DATABASE_URL` and a secure `JWT_SECRET`.
2. Run `psql "$DATABASE_URL" -f db/schema.sql`.
3. Run `npm install`, then `npm run dev`.

Create the initial librarian account with `npm run seed:librarian -- admin change-this-password`. The final optional argument sets any non-`student` librarian role.

`GET /health` verifies the API and database connection. Run `npm test` for unit tests.

## API contract

The complete contract and request examples are in [docs/API_CONTRACT.md](docs/API_CONTRACT.md); an importable Postman collection is in [docs/Smart-Library.postman_collection.json](docs/Smart-Library.postman_collection.json). All errors are `{ "error": "message", "code": "ERROR_CODE" }`; list endpoints return `{ data, total, page, limit }` where paginated.

## Deployment

On Render, create a PostgreSQL database and a Node web service rooted at `backend`; use build command `npm install`, start command `npm start`, and run `db/schema.sql` once against the provisioned database. Set `CORS_ORIGINS` to both Vercel URLs (comma separated). Free instances may sleep.

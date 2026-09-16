# Smart Library API

Express + MongoDB backend for the Smart Library MVP. It uses the official MongoDB Node.js driver and reads its connection string exclusively from `MONGODB_URI`.

## Run locally

Prerequisites: Node.js 20+ and either a local MongoDB 7+ server or a MongoDB Atlas cluster.

1. Install dependencies:

   ```bash
   cd backend
   npm install
   ```

2. Create your local environment file:

   ```bash
   cp .env.example .env
   ```

3. Set `MONGODB_URI` in `.env`. For a local server, keep the supplied default:

   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/smart_library
   JWT_SECRET=replace-with-a-long-random-secret
   ```

   For Atlas, use the complete connection string from the Atlas **Connect** dialog, for example `mongodb+srv://<user>:<password>@<cluster>/smart_library?retryWrites=true&w=majority`.

4. Start MongoDB if you are running it locally, then launch the API:

   ```bash
   npm run dev
   ```

   The server creates required collections and indexes automatically on startup. Confirm it is connected with:

   ```bash
   curl http://localhost:4000/health
   ```

5. Create a librarian account for the admin PWA:

   ```bash
   npm run seed:librarian -- admin change-this-password admin
   ```

   The final value is any non-`student` role, such as `admin` or `librarian_001`.

Run the unit tests with `npm test`.

## Data model

MongoDB collections are `users`, `books`, `copies`, `transactions`, `holds`, `fines`, and `notifications`. API records expose MongoDB `_id` values as string `id` fields. Copy reservation during checkout uses a conditional atomic update so a copy cannot be issued twice.

## API contract

The complete contract and request examples are in [docs/API_CONTRACT.md](docs/API_CONTRACT.md); an importable Postman collection is in [docs/Smart-Library.postman_collection.json](docs/Smart-Library.postman_collection.json). All errors are `{ "error": "message", "code": "ERROR_CODE" }`; list endpoints return `{ data, total, page, limit }` where paginated.

## Deployment

On Render, create a Node web service rooted at `backend` and use build command `npm install` and start command `npm start`. Supply `MONGODB_URI` from MongoDB Atlas or another reachable MongoDB provider, plus `JWT_SECRET` and `CORS_ORIGINS` (the two Vercel URLs, comma-separated). Render's managed PostgreSQL service is no longer required.

# Smart Library API contract

Base URL: `/api` (authentication routes are `/auth`). Responses are JSON.

## Authentication

`POST /auth/register` accepts `{ student_id, name, email, password, phone? }`.

`POST /auth/login` accepts `{ student_id, password }`.

`POST /auth/librarian/login` accepts `{ username, password }`.

Successful authentication returns `{ token, user }`. JWT claims are `user_id`, `student_id` (for students), `role`, and `exp`. A student always has `role: "student"`; any other non-empty role is a librarian role. Protected requests use `Authorization: Bearer <token>`.

## Common responses

Errors use `{ "error": "Human-readable message", "code": "MACHINE_CODE" }`. Collection endpoints use `{ data, total, page, limit }` unless otherwise noted.

## Student routes

| Method | Path                                          | Purpose                              |
| ------ | --------------------------------------------- | ------------------------------------ |
| GET    | `/api/student/profile`                        | Current account and dashboard counts |
| GET    | `/api/student/books`                          | Current loans                        |
| GET    | `/api/books/search?q=&category=&page=&limit=` | Search catalogue                     |
| GET    | `/api/books/:id`                              | Book and availability details        |
| POST   | `/api/student/hold`                           | `{ book_id }` creates a hold         |
| GET    | `/api/student/holds`                          | Current holds                        |
| POST   | `/api/student/extend`                         | `{ transaction_id }` renews a loan   |
| GET    | `/api/notifications`                          | Current user's notifications         |

## Librarian routes

| Method | Path                         | Purpose                                                  |
| ------ | ---------------------------- | -------------------------------------------------------- |
| POST   | `/api/scan`                  | `{ barcode, student_id?, action? }` checkout/return scan |
| GET    | `/api/admin/inventory`       | Catalogue with copy counts                               |
| POST   | `/api/admin/book`            | Create book/copies                                       |
| PUT    | `/api/admin/book/:id`        | Edit book                                                |
| POST   | `/api/admin/book/import`     | CSV multipart upload                                     |
| GET    | `/api/admin/users`           | Students                                                 |
| GET    | `/api/admin/users/:id`       | Student profile/history                                  |
| GET    | `/api/admin/transactions`    | Loans and returns                                        |
| GET    | `/api/admin/reports/overdue` | Overdue report                                           |

`student_id` values must match `^\\d{3}/\\d{2}$`, for example `001/26`.

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY, student_id VARCHAR(6) UNIQUE, username VARCHAR(80) UNIQUE,
  name VARCHAR(160) NOT NULL, email VARCHAR(254) UNIQUE NOT NULL, phone VARCHAR(30),
  password_hash TEXT NOT NULL, role VARCHAR(80) NOT NULL DEFAULT 'student',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((role = 'student' AND student_id IS NOT NULL) OR (role <> 'student' AND username IS NOT NULL))
);
CREATE TABLE books (
  id BIGSERIAL PRIMARY KEY, isbn VARCHAR(32) UNIQUE, title VARCHAR(500) NOT NULL, author VARCHAR(300) NOT NULL,
  category VARCHAR(100), publication_year INTEGER, description TEXT, cover_url TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE copies (
  id BIGSERIAL PRIMARY KEY, book_id BIGINT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  barcode VARCHAR(100) UNIQUE NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK(status IN ('available','borrowed','damaged','lost')),
  location VARCHAR(100), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY, copy_id BIGINT NOT NULL REFERENCES copies(id), user_id BIGINT NOT NULL REFERENCES users(id),
  checkout_at TIMESTAMPTZ NOT NULL DEFAULT now(), due_date DATE NOT NULL, returned_at TIMESTAMPTZ, renewal_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed'))
);
CREATE UNIQUE INDEX one_active_copy_transaction ON transactions(copy_id) WHERE status = 'active';
CREATE TABLE holds (
  id BIGSERIAL PRIMARY KEY, book_id BIGINT NOT NULL REFERENCES books(id), user_id BIGINT NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','ready','cancelled','fulfilled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX one_open_hold ON holds(book_id,user_id) WHERE status IN ('waiting','ready');
CREATE TABLE fines (id BIGSERIAL PRIMARY KEY, transaction_id BIGINT NOT NULL REFERENCES transactions(id), amount NUMERIC(10,2) NOT NULL, reason TEXT NOT NULL, paid_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE notifications (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id), type VARCHAR(50) NOT NULL, message TEXT NOT NULL, read_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX books_search_idx ON books USING gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(author,'')));
CREATE INDEX transaction_user_idx ON transactions(user_id, status);

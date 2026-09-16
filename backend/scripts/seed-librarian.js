import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

const [username, password, name = 'Library Administrator', role = 'admin'] = process.argv.slice(2);
if (!username || !password) { console.error('Usage: npm run seed:librarian -- <username> <password> [name] [role]'); process.exit(1); }
try {
  const hash = await bcrypt.hash(password, 12);
  await pool.query('INSERT INTO users(username,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5) ON CONFLICT(username) DO UPDATE SET password_hash=EXCLUDED.password_hash,role=EXCLUDED.role', [username, name, `${username}@library.local`, hash, role]);
  console.info(`Librarian ${username} is ready.`);
} finally { await pool.end(); }

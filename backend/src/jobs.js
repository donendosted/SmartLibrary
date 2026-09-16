import cron from 'node-cron'; import { query } from './db.js'; import { config } from './config.js';
export function startJobs() {
  cron.schedule('0 9 * * *', async () => { try { const {rows}=await query("SELECT t.id,t.user_id,b.title,current_date-t.due_date days FROM transactions t JOIN copies c ON c.id=t.copy_id JOIN books b ON b.id=c.book_id WHERE t.status='active' AND t.due_date<current_date"); for(const r of rows) { await query('INSERT INTO notifications(user_id,type,message) VALUES($1,$2,$3)',[r.user_id,'overdue',`${r.title} is ${r.days} day(s) overdue.`]); } } catch(e) { console.error('overdue job failed',e); } });
  cron.schedule('0 8 * * 1', async () => { try { console.info('Weekly librarian digest scheduled; configure an email provider to deliver it.'); } catch(e) { console.error('digest job failed',e); } });
}

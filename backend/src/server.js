import app from './app.js'; import { config } from './config.js'; import { connectDatabase } from './db.js'; import { startJobs } from './jobs.js';
connectDatabase().then(() => { app.listen(config.port,()=>console.info(`Smart Library API listening on ${config.port}`)); startJobs(); }).catch((error) => { console.error('MongoDB connection failed', error); process.exit(1); });

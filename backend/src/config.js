import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || 'development-only-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(',').map((value) => value.trim()),
  loanDurationDays: Number(process.env.LOAN_DURATION_DAYS || 14),
  dailyFineRate: Number(process.env.DAILY_FINE_RATE || 5)
};

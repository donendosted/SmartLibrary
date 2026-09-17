import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 4000),
  mongodbUri: process.env.MONGODB_URI,
  booksDatabase: process.env.MONGODB_BOOKS_DB || "smart_library_books",
  studentsDatabase: process.env.MONGODB_STUDENTS_DB || "smart_library_students",
  jwtSecret: process.env.JWT_SECRET || "development-only-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigins: (
    process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001"
  )
    .split(",")
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter(Boolean),
  loanDurationDays: Number(process.env.LOAN_DURATION_DAYS || 14),
  dailyFineRate: Number(process.env.DAILY_FINE_RATE || 5),
  librarianEmail: process.env.LIBRARIAN_EMAIL || "librarian@buie.ac.in",
  smtpUrl: process.env.SMTP_URL,
  espDeviceToken: process.env.ESP_DEVICE_TOKEN,
};

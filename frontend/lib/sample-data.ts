import type { Book, Notification } from "./types";
export const sampleBooks: Book[] = [
  {
    id: 1,
    title: "The Midnight Library",
    author: "Matt Haig",
    category: "Fiction",
    available_copies: 3,
    due_date: "2026-09-26",
    renewal_count: 0,
  },
  {
    id: 2,
    title: "Atomic Habits",
    author: "James Clear",
    category: "Self-help",
    available_copies: 0,
    due_date: "2026-09-19",
    renewal_count: 1,
    fine_amount: 0,
  },
];
export const sampleSearch: Book[] = [
  ...sampleBooks,
  {
    id: 3,
    title: "A Brief History of Time",
    author: "Stephen Hawking",
    category: "Science",
    available_copies: 2,
    description: "An accessible journey through space, time and the universe.",
    publication_year: 1988,
  },
];
export const sampleNotifications: Notification[] = [
  {
    id: 1,
    message: "Atomic Habits is due in 3 days.",
    type: "due",
    is_read: false,
    created_at: "Today",
  },
  {
    id: 2,
    message: "Your hold is now ready for collection.",
    type: "hold",
    is_read: false,
    created_at: "Yesterday",
  },
];

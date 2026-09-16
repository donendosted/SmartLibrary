export type Book = { id: number; title: string; author: string; isbn?: string; category?: string; description?: string; publication_year?: number; available_copies: number; total_copies?: number; due_date?: string; renewal_count?: number; fine_amount?: number };
export type Student = { id: number; name: string; student_id: string; email: string; phone?: string; outstanding_fines?: number };
export type Hold = { id: number; book: Book; queue_position: number; queue_total: number; status: string; created_at: string };
export type Notification = { id: number; message: string; type: 'due'|'overdue'|'hold'|'general'; is_read: boolean; created_at: string };

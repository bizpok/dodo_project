-- Add start_date column to tasks table for project schedule period (start_date ~ due_date)
alter table public.tasks
  add column if not exists start_date date;

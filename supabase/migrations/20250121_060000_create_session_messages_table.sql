-- Migration: Create session_messages table for message cleanup tracking
-- Purpose: Track all messages (incoming and outgoing) per session to enable cleanup after command completion
-- Affected tables: New table 'session_messages', references 'user_sessions'
-- Special considerations: Enables cascade deletion and message type tracking

-- Create session_messages table to track all messages per session
-- This table enables cleanup of all messages when a session completes or is deleted
create table public.session_messages (
  id serial primary key,
  session_id integer not null,
  message_id bigint not null,
  message_type text not null check (message_type in ('incoming', 'outgoing')),
  created_at timestamp with time zone default now(),
  is_last_message boolean default false,
  
  -- Ensure unique message IDs per session to prevent duplicates
  unique(session_id, message_id),
  
  -- Foreign key constraint to user_sessions table
  -- Cascade delete ensures messages are cleaned up when session is deleted
  constraint session_messages_session_id_fkey 
    foreign key (session_id) 
    references public.user_sessions(id) 
    on delete cascade
);

-- Add table comment
comment on table public.session_messages is 'Tracks all messages (incoming and outgoing) per session for cleanup purposes';

-- Add column comments
comment on column public.session_messages.id is 'Primary key for session message tracking';
comment on column public.session_messages.session_id is 'Reference to user_sessions table';
comment on column public.session_messages.message_id is 'Telegram message ID';
comment on column public.session_messages.message_type is 'Type of message: incoming (from user) or outgoing (from bot)';
comment on column public.session_messages.created_at is 'Timestamp when message was tracked';
comment on column public.session_messages.is_last_message is 'Flag to mark the final message to preserve during cleanup';

-- Create index for efficient querying by session_id
create index idx_session_messages_session_id on public.session_messages(session_id);

-- Create index for efficient querying by message_type
create index idx_session_messages_message_type on public.session_messages(message_type);

-- Create index for efficient querying by is_last_message flag
create index idx_session_messages_is_last_message on public.session_messages(is_last_message);

-- Enable row level security (required for all tables in supabase)
alter table public.session_messages enable row level security;

-- Create RLS policies for anon role (bot operations)
-- Policy for select operations - allow bot to read all session messages
create policy "Allow anon users to select session messages"
on public.session_messages
for select
to anon
using (true);

-- Policy for insert operations - allow bot to track new messages
create policy "Allow anon users to insert session messages"
on public.session_messages
for insert
to anon
with check (true);

-- Policy for update operations - allow bot to update message flags
create policy "Allow anon users to update session messages"
on public.session_messages
for update
to anon
using (true)
with check (true);

-- Policy for delete operations - allow bot to delete tracked messages
create policy "Allow anon users to delete session messages"
on public.session_messages
for delete
to anon
using (true);

-- Create RLS policies for authenticated role (if needed for admin operations)
-- Policy for select operations - allow authenticated users to read session messages
create policy "Allow authenticated users to select session messages"
on public.session_messages
for select
to authenticated
using (true);

-- Policy for insert operations - allow authenticated users to track messages
create policy "Allow authenticated users to insert session messages"
on public.session_messages
for insert
to authenticated
with check (true);

-- Policy for update operations - allow authenticated users to update messages
create policy "Allow authenticated users to update session messages"
on public.session_messages
for update
to authenticated
using (true)
with check (true);

-- Policy for delete operations - allow authenticated users to delete messages
create policy "Allow authenticated users to delete session messages"
on public.session_messages
for delete
to authenticated
using (true);

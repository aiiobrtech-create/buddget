-- Buckets BUDDGET no Supabase Storage (executar uma vez no SQL Editor ou via CI).
-- Idempotente: pode rodar de novo com ON CONFLICT.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('buddget-imports', 'buddget-imports', false, null, null),
  ('buddget-exports', 'buddget-exports', false, null, null),
  ('buddget-attachments', 'buddget-attachments', false, null, null)
on conflict (id) do update set name = excluded.name;

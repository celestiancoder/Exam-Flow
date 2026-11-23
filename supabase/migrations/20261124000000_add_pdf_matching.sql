alter table public.print_jobs
  add column if not exists pdf_path text,
  add column if not exists pdf_name text;

alter table public.print_jobs enable row level security;

grant usage on schema public to authenticated;
grant select, insert on table public.print_jobs to authenticated;

drop policy if exists "Authenticated users can view print jobs" on public.print_jobs;
create policy "Authenticated users can view print jobs"
  on public.print_jobs
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert print jobs" on public.print_jobs;
create policy "Authenticated users can insert print jobs"
  on public.print_jobs
  for insert
  to authenticated
  with check (true);

insert into storage.buckets (id, name, public)
values ('exam_pdfs', 'exam_pdfs', false)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload exam PDFs" on storage.objects;
create policy "Authenticated users can upload exam PDFs"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'exam_pdfs');

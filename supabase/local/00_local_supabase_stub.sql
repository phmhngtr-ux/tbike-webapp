-- CHI DUNG CHO POSTGRES CUC BO (khong phai Supabase). Tao toi thieu nhung doi tuong
-- ma Supabase co san de migration T-Bike chay duoc: schema auth, bang auth.users,
-- role anon/authenticated. KHONG chay file nay tren Supabase.
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  email text unique
);
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;

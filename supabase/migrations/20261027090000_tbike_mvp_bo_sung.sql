-- T-BIKE MVP | Migration BO SUNG (additive) - chay SAU 20261026170000_tbike_schema.sql
-- Khong sua migration goc. Moi thay doi o day chi THEM cot / rang buoc / trigger.
--
-- Ly do tung muc:
--  1. CR-01 (da duoc Business Owner chap thuan): hinh thuc nhan xe + dia chi giao xe.
--  2. C3 yeu cau ly do khi tu choi de khach tra cuu -> schema goc chua co cot luu ly do.
--     Khong dat CHECK bat buoc o DB vi seed.sql co san 1 dong TuChoi khong ly do;
--     backend bat buoc nhap ly do cho moi lan tu choi moi.
--  3. Chong trung lich o muc DB (nhieu nhan vien xac nhan dong thoi):
--     exclusion constraint tren (ma_xe, [nhan, tra)) cho don DaXacNhan/DangThue.
--     Backend van khoa dong xe (SELECT ... FOR UPDATE) va kiem tra truoc; rang buoc nay la lop bao ve cuoi.
--  4. Schema goc ghi chu "ngay_cap_nhat khong tu cap nhat" -> them trigger.
--  5. NFR-03: don HoanTat khong duoc sua ODO / thoi gian / phi -> trigger chan moi UPDATE tren don HoanTat.

begin;

-- 1. CR-01: hinh thuc nhan xe
create type public.hinh_thuc_nhan_xe_enum as enum ('TaiCuaHang', 'GiaoTanNoi');

alter table public.yeu_cau_thue
  add column hinh_thuc_nhan_xe public.hinh_thuc_nhan_xe_enum not null default 'TaiCuaHang',
  add column dia_chi_giao_xe varchar(255),
  add constraint ck_dia_chi_giao_xe check (
    hinh_thuc_nhan_xe <> 'GiaoTanNoi'
    or (dia_chi_giao_xe is not null and length(btrim(dia_chi_giao_xe)) > 0)
  );

-- 2. Ly do tu choi
alter table public.yeu_cau_thue
  add column ly_do_tu_choi varchar(255);

-- 3. Chong trung lich (btree_gist cho toan tu "=" tren varchar trong GiST)
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

alter table public.yeu_cau_thue
  add constraint ex_khong_trung_lich_xe
  exclude using gist (
    ma_xe with =,
    tstzrange(thoi_gian_nhan_du_kien, thoi_gian_tra_du_kien, '[)') with &&
  )
  where (trang_thai_xu_ly in ('DaXacNhan', 'DangThue'));

-- 4. Tu cap nhat ngay_cap_nhat
create or replace function public.tbike_set_ngay_cap_nhat()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.ngay_cap_nhat := now();
  return new;
end;
$$;

create trigger trg_yeu_cau_thue_ngay_cap_nhat
  before update on public.yeu_cau_thue
  for each row execute function public.tbike_set_ngay_cap_nhat();

-- 5. Khoa don HoanTat (SQLSTATE rieng TB001 de backend nhan dien)
create or replace function public.tbike_khoa_don_hoan_tat()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.trang_thai_xu_ly = 'HoanTat' then
    raise exception 'Don % da HoanTat, khong duoc chinh sua', old.ma_yeu_cau
      using errcode = 'TB001';
  end if;
  return new;
end;
$$;

-- Ten "trg_a_..." de chay TRUOC trigger ngay_cap_nhat (trigger cung loai chay theo thu tu ten).
create trigger trg_a_khoa_don_hoan_tat
  before update on public.yeu_cau_thue
  for each row execute function public.tbike_khoa_don_hoan_tat();

create index if not exists idx_yeu_cau_ngay_cap_nhat on public.yeu_cau_thue (ngay_cap_nhat desc);

revoke all on function public.tbike_set_ngay_cap_nhat() from public, anon, authenticated;
revoke all on function public.tbike_khoa_don_hoan_tat() from public, anon, authenticated;

commit;

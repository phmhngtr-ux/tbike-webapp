"""Ket noi PostgreSQL (Supabase) bang psycopg 3 + connection pool.

Moi request lay 1 ket noi va chay trong 1 transaction:
- ket thuc request thanh cong -> COMMIT (truoc khi tra response),
- co loi -> ROLLBACK.
Backend ket noi bang role co quyen (postgres) nen RLS/grant cua anon/authenticated khong anh huong;
trinh duyet KHONG bao gio ket noi truc tiep vao cac bang nghiep vu.
"""
from collections.abc import Iterator

from psycopg import Connection
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

_pool: ConnectionPool | None = None


def init_pool(database_url: str, min_size: int = 1, max_size: int = 10) -> ConnectionPool:
    global _pool
    if not database_url:
        raise RuntimeError("Thieu DATABASE_URL - kiem tra file .env cua backend")
    _pool = ConnectionPool(
        database_url,
        min_size=min_size,
        max_size=max_size,
        # prepare_threshold=None: tuong thich Supabase transaction pooler (pgbouncer)
        kwargs={"row_factory": dict_row, "autocommit": False, "prepare_threshold": None},
        open=True,
    )
    return _pool


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


def get_db() -> Iterator[Connection]:
    if _pool is None:
        raise RuntimeError("Connection pool chua duoc khoi tao")
    with _pool.connection() as conn:
        yield conn

"""Xu ly loi tap trung. Moi loi tra ve dang:
{"error": {"code": "...", "message": "...", "details": ...}}
"""
import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from psycopg import errors as pg_errors

log = logging.getLogger("tbike")


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str, details: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


def not_found(message: str) -> AppError:
    return AppError(404, "NOT_FOUND", message)


def conflict(code: str, message: str, details: Any = None) -> AppError:
    return AppError(409, code, message, details)


def invalid(code: str, message: str, details: Any = None) -> AppError:
    return AppError(422, code, message, details)


def _body(code: str, message: str, details: Any = None) -> dict:
    return {"error": {"code": code, "message": message, "details": details}}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError):
        return JSONResponse(status_code=exc.status_code, content=_body(exc.code, exc.message, exc.details))

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError):
        details = [
            {"field": ".".join(str(p) for p in e["loc"] if p not in ("body", "query", "path")), "message": e["msg"]}
            for e in exc.errors()
        ]
        return JSONResponse(status_code=422, content=_body("VALIDATION_ERROR", "Dữ liệu gửi lên không hợp lệ", details))

    @app.exception_handler(pg_errors.ExclusionViolation)
    async def _exclusion(_: Request, exc: pg_errors.ExclusionViolation):
        return JSONResponse(status_code=409, content=_body("SCHEDULE_CONFLICT", "Xe đã có đơn xác nhận trùng thời gian thuê"))

    @app.exception_handler(pg_errors.CheckViolation)
    async def _check(_: Request, exc: pg_errors.CheckViolation):
        name = getattr(exc.diag, "constraint_name", None)
        return JSONResponse(status_code=422, content=_body("DB_CONSTRAINT", "Dữ liệu vi phạm ràng buộc của hệ thống", {"constraint": name}))

    @app.exception_handler(pg_errors.ForeignKeyViolation)
    async def _fk(_: Request, exc: pg_errors.ForeignKeyViolation):
        name = getattr(exc.diag, "constraint_name", None)
        return JSONResponse(status_code=422, content=_body("DB_REFERENCE", "Dữ liệu tham chiếu không tồn tại", {"constraint": name}))

    @app.exception_handler(pg_errors.RaiseException)
    async def _raise(_: Request, exc: pg_errors.RaiseException):
        if exc.sqlstate == "TB001":
            return JSONResponse(status_code=409, content=_body("ORDER_LOCKED", "Đơn đã hoàn tất, không được chỉnh sửa"))
        log.exception("Loi tu trigger DB")
        return JSONResponse(status_code=500, content=_body("INTERNAL_ERROR", "Lỗi hệ thống, vui lòng thử lại"))

    @app.exception_handler(pg_errors.Error)
    async def _pg(_: Request, exc: pg_errors.Error):
        if getattr(exc, "sqlstate", None) == "TB001":
            return JSONResponse(status_code=409, content=_body("ORDER_LOCKED", "Đơn đã hoàn tất, không được chỉnh sửa"))
        log.exception("Loi co so du lieu")
        return JSONResponse(status_code=500, content=_body("DATABASE_ERROR", "Lỗi cơ sở dữ liệu, vui lòng thử lại"))

    @app.exception_handler(Exception)
    async def _unexpected(_: Request, exc: Exception):
        log.exception("Loi khong mong doi")
        return JSONResponse(status_code=500, content=_body("INTERNAL_ERROR", "Lỗi hệ thống, vui lòng thử lại"))

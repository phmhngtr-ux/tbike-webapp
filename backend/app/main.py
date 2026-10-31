"""Diem vao FastAPI cua T-Bike.

Chay: uvicorn app.main:app --reload --port 8000  (trong thu muc backend/)
Tai lieu API tu dong: http://localhost:8000/docs
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import db
from .config import get_settings
from .errors import register_error_handlers
from .routers import dashboard, public, rentals, staff, vehicles

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


def create_app(init_db: bool = True) -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        if init_db:
            db.init_pool(settings.database_url)
        yield
        if init_db:
            db.close_pool()

    app = FastAPI(title="T-Bike API", version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
    register_error_handlers(app)
    for r in (public.router, staff.router, dashboard.router, vehicles.router, rentals.router):
        app.include_router(r)

    @app.get("/api/health", tags=["Hệ thống"])
    def health():
        return {"status": "ok"}

    return app


app = create_app()

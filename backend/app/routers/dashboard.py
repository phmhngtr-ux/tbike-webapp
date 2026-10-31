from fastapi import APIRouter, Depends
from psycopg import Connection

from ..auth import CurrentStaff, any_staff
from ..db import get_db
from ..schemas import DashboardSummary
from ..services import dashboard as svc

router = APIRouter(prefix="/api/dashboard", tags=["Tổng quan"])


@router.get("/summary", response_model=DashboardSummary)
def summary(_: CurrentStaff = Depends(any_staff), conn: Connection = Depends(get_db)):
    return svc.summary(conn)

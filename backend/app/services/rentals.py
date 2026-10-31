"""Vong doi yeu cau thue / don thue tren 1 bang yeu_cau_thue.

DaGui --confirm--> DaXacNhan --handover--> DangThue --return (ghi ODO/phi)--> DangThue --close--> HoanTat
DaGui --reject--> TuChoi

Moi thao tac ghi khoa dong yeu cau (FOR UPDATE) de chong thao tac lap/dong thoi.
Xac nhan don khoa them dong xe de tuan tu hoa viec kiem tra trung lich theo tung xe;
exclusion constraint ex_khong_trung_lich_xe la lop bao ve cuoi o DB.
"""
from datetime import datetime, timedelta

from psycopg import Connection, errors as pg_errors

from .. import clock
from ..auth import CurrentStaff
from ..domain.codes import make_request_code, order_code_for
from ..domain.late_fee import LateFeeConfigError, LateFeeRule, calculate_late_fee, validate_rules
from ..domain.maintenance import km_since_maintenance, needs_maintenance, status_after_close
from ..errors import AppError, conflict, invalid, not_found
from ..schemas import (
    CloseRequest, CloseResult, ConfirmRequest, ConfirmResult, DepositUpdate, HandoverRequest,
    LateFeeBreakdown, Page, RejectRequest, RentalRequest, RentalRequestCreate, RentalRequestCreated,
    ReturnRequest, ReturnResult,
)
from .common import OVERLAP_SQL, REQUEST_SELECT, to_request

CLOCK_SKEW = timedelta(minutes=5)
PAST_PICKUP_TOLERANCE = timedelta(minutes=10)


# ---------------- doc ----------------
def _fetch_request(conn: Connection, where: str, value: str) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(REQUEST_SELECT + f" where {where} = %s", (value,))
        return cur.fetchone()


def get_request(conn: Connection, ma_yeu_cau: str) -> RentalRequest:
    row = _fetch_request(conn, "y.ma_yeu_cau", ma_yeu_cau)
    if row is None:
        raise not_found("Không tìm thấy yêu cầu thuê")
    return to_request(row)


def get_order(conn: Connection, ma_don_thue: str) -> RentalRequest:
    row = _fetch_request(conn, "y.ma_don_thue", ma_don_thue)
    if row is None:
        raise not_found("Không tìm thấy đơn thuê")
    return to_request(row)


def list_requests(
    conn: Connection,
    trang_thai: list[str] | None,
    q: str | None,
    tu: datetime | None,
    den: datetime | None,
    ma_xe: str | None,
    page: int,
    page_size: int,
) -> Page[RentalRequest]:
    where, params = ["true"], {}
    if trang_thai:
        where.append("y.trang_thai_xu_ly::text = any(%(tt)s)")
        params["tt"] = trang_thai
    if q:
        where.append(
            "(y.ma_yeu_cau ilike %(q)s or y.ma_don_thue ilike %(q)s or y.ho_ten_khach ilike %(q)s "
            "or y.so_dien_thoai ilike %(q)s or y.ma_xe ilike %(q)s)"
        )
        params["q"] = f"%{q.strip()}%"
    if tu:
        where.append("y.thoi_gian_tra_du_kien > %(tu)s")
        params["tu"] = tu
    if den:
        where.append("y.thoi_gian_nhan_du_kien < %(den)s")
        params["den"] = den
    if ma_xe:
        where.append("y.ma_xe = %(ma_xe)s")
        params["ma_xe"] = ma_xe
    params.update(limit=page_size, offset=(page - 1) * page_size)
    sql = (
        "select t.*, count(*) over() as _total from (" + REQUEST_SELECT + " where " + " and ".join(where) + ") t "
        "order by case t.trang_thai_xu_ly when 'DaGui' then 0 when 'DaXacNhan' then 1 when 'DangThue' then 2 else 3 end, "
        "t.thoi_gian_nhan_du_kien asc limit %(limit)s offset %(offset)s"
    )
    with conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
    total = rows[0]["_total"] if rows else _count(conn, where, params)
    return Page[RentalRequest](items=[to_request(r) for r in rows], total=total, page=page, page_size=page_size)


def _count(conn: Connection, where: list[str], params: dict) -> int:
    with conn.cursor() as cur:
        cur.execute("select count(*) as n from (" + REQUEST_SELECT + " where " + " and ".join(where) + ") t", params)
        return cur.fetchone()["n"]


def find_overlaps(conn: Connection, ma_xe: str, tu: datetime, den: datetime, exclude: str | None = None) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(OVERLAP_SQL, {"ma_xe": ma_xe, "tu": tu, "den": den, "exclude": exclude})
        return cur.fetchall()


# ---------------- khach gui yeu cau ----------------
def create_request(conn: Connection, body: RentalRequestCreate) -> RentalRequestCreated:
    now = clock.now()
    if body.thoi_gian_nhan_du_kien < now - PAST_PICKUP_TOLERANCE:
        raise invalid("PICKUP_IN_PAST", "Thời gian nhận xe phải ở hiện tại hoặc tương lai")
    with conn.cursor() as cur:
        cur.execute("select ma_xe, trang_thai::text as trang_thai from public.xe where ma_xe = %s for share", (body.ma_xe,))
        xe = cur.fetchone()
    if xe is None:
        raise not_found("Không tìm thấy xe đã chọn")
    if xe["trang_thai"] == "CanBaoDuong":
        raise conflict("VEHICLE_UNAVAILABLE", "Xe đang tạm ngừng cho thuê để bảo dưỡng, vui lòng chọn xe khác")
    if find_overlaps(conn, body.ma_xe, body.thoi_gian_nhan_du_kien, body.thoi_gian_tra_du_kien):
        raise conflict("VEHICLE_UNAVAILABLE", "Xe đã có lịch thuê trong khoảng thời gian này, vui lòng chọn xe hoặc thời gian khác")

    for _ in range(5):
        code = make_request_code()
        try:
            with conn.transaction():
                with conn.cursor() as cur:
                    cur.execute(
                        """insert into public.yeu_cau_thue
                           (ma_yeu_cau, ma_xe, ho_ten_khach, so_dien_thoai, ghi_chu_yeu_cau,
                            thoi_gian_nhan_du_kien, thoi_gian_tra_du_kien, hinh_thuc_nhan_xe, dia_chi_giao_xe)
                           values (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                        (code, body.ma_xe, body.ho_ten_khach, body.so_dien_thoai, body.ghi_chu_yeu_cau,
                         body.thoi_gian_nhan_du_kien, body.thoi_gian_tra_du_kien,
                         body.hinh_thuc_nhan_xe, body.dia_chi_giao_xe),
                    )
            return RentalRequestCreated(
                ma_yeu_cau=code,
                trang_thai_xu_ly="DaGui",
                thong_bao="Đã gửi yêu cầu. Đây chưa phải xác nhận thuê — cửa hàng sẽ gọi lại để xác nhận lịch và bảo đảm.",
            )
        except pg_errors.UniqueViolation:
            continue
    raise AppError(500, "CODE_GENERATION_FAILED", "Không tạo được mã yêu cầu, vui lòng thử lại")


# ---------------- nhan vien xu ly ----------------
def _lock_by(conn: Connection, column: str, value: str) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            f"""select y.*, y.trang_thai_xu_ly::text as tt, y.trang_thai_bao_dam::text as tt_bd
                from public.yeu_cau_thue y where y.{column} = %s for update""",
            (value,),
        )
        row = cur.fetchone()
    if row is None:
        raise not_found("Không tìm thấy " + ("yêu cầu thuê" if column == "ma_yeu_cau" else "đơn thuê"))
    return row


def _lock_vehicle(conn: Connection, ma_xe: str) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """select x.ma_xe, x.trang_thai::text as trang_thai, x.odo_hien_tai, x.odo_bao_duong_gan_nhat, q.nguong_km
               from public.xe x join public.quy_tac_bao_duong q on q.ma_quy_tac = x.ma_quy_tac_bao_duong
               where x.ma_xe = %s for update of x""",
            (ma_xe,),
        )
        return cur.fetchone()


def _require_state(row: dict, allowed: tuple[str, ...], action: str) -> None:
    if row["tt"] not in allowed:
        raise conflict(
            "INVALID_STATE",
            f"Không thể {action}: đơn đang ở trạng thái {row['tt']}",
            {"trang_thai_hien_tai": row["tt"], "trang_thai_hop_le": list(allowed)},
        )


def _check_deposit_method(conn: Connection, ma_phuong_thuc: str) -> None:
    with conn.cursor() as cur:
        cur.execute("select dang_ap_dung from public.phuong_thuc_bao_dam where ma_phuong_thuc = %s", (ma_phuong_thuc,))
        row = cur.fetchone()
    if row is None or not row["dang_ap_dung"]:
        raise invalid("DEPOSIT_METHOD_INVALID", "Hình thức bảo đảm không hợp lệ hoặc đã ngừng áp dụng")


def confirm(conn: Connection, ma_yeu_cau: str, body: ConfirmRequest, staff: CurrentStaff) -> ConfirmResult:
    row = _lock_by(conn, "ma_yeu_cau", ma_yeu_cau)
    _require_state(row, ("DaGui",), "xác nhận yêu cầu")
    xe = _lock_vehicle(conn, row["ma_xe"])
    overlaps = find_overlaps(conn, row["ma_xe"], row["thoi_gian_nhan_du_kien"], row["thoi_gian_tra_du_kien"], ma_yeu_cau)
    if overlaps:
        raise conflict(
            "SCHEDULE_CONFLICT",
            f"Xe {row['ma_xe']} đã có đơn xác nhận trùng thời gian",
            {"don_trung": [o["ma_don_thue"] or o["ma_yeu_cau"] for o in overlaps]},
        )
    if body.ma_phuong_thuc_bao_dam:
        _check_deposit_method(conn, body.ma_phuong_thuc_bao_dam)
    with conn.cursor() as cur:
        cur.execute(
            "select g.don_gia_ngay_vnd from public.xe x join public.bang_gia_thue g on g.loai_xe = x.loai_xe where x.ma_xe = %s",
            (row["ma_xe"],),
        )
        price = cur.fetchone()["don_gia_ngay_vnd"]
        cur.execute(
            """update public.yeu_cau_thue
               set trang_thai_xu_ly = 'DaXacNhan', ma_don_thue = %s, don_gia_ap_dung_vnd = %s,
                   nguoi_xac_nhan = %s, ma_phuong_thuc_bao_dam = %s, trang_thai_bao_dam = %s
               where ma_yeu_cau = %s""",
            (order_code_for(ma_yeu_cau), price, staff.ma_nhan_vien, body.ma_phuong_thuc_bao_dam,
             body.trang_thai_bao_dam, ma_yeu_cau),
        )
    warnings = []
    if xe["trang_thai"] == "CanBaoDuong":
        warnings.append("Xe đang ở trạng thái Cần bảo dưỡng: cần bảo dưỡng xong trước khi giao xe.")
    if row["thoi_gian_nhan_du_kien"] < clock.now():
        warnings.append("Thời gian nhận xe dự kiến đã qua, hãy liên hệ khách để thống nhất lại.")
    return ConfirmResult(don=get_request(conn, ma_yeu_cau), canh_bao=warnings)


def reject(conn: Connection, ma_yeu_cau: str, body: RejectRequest, staff: CurrentStaff) -> RentalRequest:
    row = _lock_by(conn, "ma_yeu_cau", ma_yeu_cau)
    _require_state(row, ("DaGui",), "từ chối yêu cầu")
    with conn.cursor() as cur:
        cur.execute(
            """update public.yeu_cau_thue set trang_thai_xu_ly = 'TuChoi', ly_do_tu_choi = %s, nguoi_xac_nhan = %s
               where ma_yeu_cau = %s""",
            (body.ly_do, staff.ma_nhan_vien, ma_yeu_cau),
        )
    return get_request(conn, ma_yeu_cau)


def update_deposit(conn: Connection, ma_don_thue: str, body: DepositUpdate) -> RentalRequest:
    row = _lock_by(conn, "ma_don_thue", ma_don_thue)
    _require_state(row, ("DaXacNhan",), "cập nhật bảo đảm (chỉ trước khi giao xe)")
    _check_deposit_method(conn, body.ma_phuong_thuc_bao_dam)
    with conn.cursor() as cur:
        cur.execute(
            """update public.yeu_cau_thue set ma_phuong_thuc_bao_dam = %s, trang_thai_bao_dam = %s
               where ma_don_thue = %s""",
            (body.ma_phuong_thuc_bao_dam, body.trang_thai_bao_dam, ma_don_thue),
        )
    return get_order(conn, ma_don_thue)


def handover(conn: Connection, ma_don_thue: str, body: HandoverRequest) -> RentalRequest:
    row = _lock_by(conn, "ma_don_thue", ma_don_thue)
    if row["tt"] == "DangThue" and row["thoi_diem_giao_xe"] is not None:
        raise conflict("ALREADY_HANDED_OVER", "Đơn này đã được giao xe trước đó")
    _require_state(row, ("DaXacNhan",), "giao xe")
    if row["tt_bd"] != "DaXacNhan" or not row["ma_phuong_thuc_bao_dam"]:
        raise conflict("DEPOSIT_NOT_CONFIRMED", "Cần ghi nhận bảo đảm ở trạng thái Đã xác nhận trước khi giao xe")
    xe = _lock_vehicle(conn, row["ma_xe"])
    if xe["trang_thai"] == "CanBaoDuong":
        raise conflict("VEHICLE_NEEDS_MAINTENANCE", "Xe đang cần bảo dưỡng, chưa thể giao cho khách")
    if xe["trang_thai"] == "DangThue":
        raise conflict("VEHICLE_IN_RENTAL", "Xe đang được thuê trong một đơn khác")
    if body.odo_giao_xe < xe["odo_hien_tai"]:
        raise invalid(
            "ODO_LT_CURRENT",
            f"ODO bàn giao không được nhỏ hơn ODO hiện tại của xe ({xe['odo_hien_tai']} km)",
            {"odo_hien_tai": xe["odo_hien_tai"]},
        )
    now = clock.now()
    at = body.thoi_diem_giao_xe or now
    if at > now + CLOCK_SKEW:
        raise invalid("TIME_IN_FUTURE", "Thời điểm giao xe không được ở tương lai")
    with conn.cursor() as cur:
        cur.execute(
            """update public.yeu_cau_thue set trang_thai_xu_ly = 'DangThue', odo_giao_xe = %s, thoi_diem_giao_xe = %s
               where ma_don_thue = %s""",
            (body.odo_giao_xe, at, ma_don_thue),
        )
        cur.execute(
            "update public.xe set trang_thai = 'DangThue', odo_hien_tai = %s where ma_xe = %s",
            (body.odo_giao_xe, row["ma_xe"]),
        )
    return get_order(conn, ma_don_thue)


def _load_rules(conn: Connection) -> list[LateFeeRule]:
    with conn.cursor() as cur:
        cur.execute(
            "select ma_quy_tac, tu_gio_tre, gom_moc_duoi, den_gio_tre, gom_moc_tren, he_so_ngay from public.quy_tac_phi_tre"
        )
        rules = [LateFeeRule(**r) for r in cur.fetchall()]
    try:
        validate_rules(rules)
    except LateFeeConfigError as exc:
        raise AppError(500, "LATE_FEE_CONFIG", str(exc)) from exc
    return rules


def _breakdown(rules, price: int, expected: datetime, actual: datetime) -> tuple[LateFeeBreakdown, object]:
    r = calculate_late_fee(rules, price, expected, actual)
    return (
        LateFeeBreakdown(
            thoi_gian_tra_du_kien=expected,
            thoi_gian_tra_thuc_te=actual,
            so_phut_tre=r.so_giay_tre // 60,
            so_gio_tre=float(r.so_gio_tre),
            ma_quy_tac=r.ma_quy_tac,
            mo_ta_muc=r.mo_ta_muc,
            he_so_ngay=float(r.he_so_ngay),
            don_gia_ngay_vnd=r.don_gia_ngay_vnd,
            phu_phi_vnd=r.phu_phi_vnd,
        ),
        r,
    )


def preview_late_fee(conn: Connection, ma_don_thue: str, actual: datetime) -> LateFeeBreakdown:
    order = get_order(conn, ma_don_thue)
    if order.trang_thai_xu_ly not in ("DangThue", "HoanTat") or order.don_gia_ap_dung_vnd is None:
        raise conflict("INVALID_STATE", "Chỉ xem trước phí trễ cho đơn đang thuê")
    breakdown, _ = _breakdown(_load_rules(conn), order.don_gia_ap_dung_vnd, order.thoi_gian_tra_du_kien, actual)
    return breakdown


def return_vehicle(conn: Connection, ma_don_thue: str, body: ReturnRequest) -> ReturnResult:
    row = _lock_by(conn, "ma_don_thue", ma_don_thue)
    if row["thoi_gian_tra_thuc_te"] is not None:
        raise conflict("ALREADY_RETURNED", "Đơn này đã được ghi nhận nhận xe trước đó")
    _require_state(row, ("DangThue",), "nhận xe")
    if row["thoi_diem_giao_xe"] is None or row["odo_giao_xe"] is None:
        raise conflict("NOT_HANDED_OVER", "Đơn chưa có thông tin giao xe")
    if body.odo_nhan_xe < row["odo_giao_xe"]:
        raise invalid(
            "ODO_LT_HANDOVER",
            f"ODO nhận phải lớn hơn hoặc bằng ODO giao ({row['odo_giao_xe']} km)",
            {"odo_giao_xe": row["odo_giao_xe"]},
        )
    now = clock.now()
    actual = body.thoi_gian_tra_thuc_te or now
    if actual > now + CLOCK_SKEW:
        raise invalid("TIME_IN_FUTURE", "Thời gian trả thực tế không được ở tương lai")
    if actual < row["thoi_diem_giao_xe"]:
        raise invalid("RETURN_BEFORE_HANDOVER", "Thời gian trả không được trước thời điểm giao xe")
    breakdown, result = _breakdown(_load_rules(conn), row["don_gia_ap_dung_vnd"], row["thoi_gian_tra_du_kien"], actual)
    distance = body.odo_nhan_xe - row["odo_giao_xe"]
    with conn.cursor() as cur:
        cur.execute(
            """update public.yeu_cau_thue
               set odo_nhan_xe = %s, thoi_gian_tra_thuc_te = %s, quang_duong_luot_thue = %s,
                   so_gio_tre = %s, ma_quy_tac_phi_tre = %s, he_so_phi_tre_ap_dung = %s, phu_phi_tre_han_vnd = %s
               where ma_don_thue = %s""",
            (body.odo_nhan_xe, actual, distance, result.so_gio_tre, result.ma_quy_tac,
             result.he_so_ngay, result.phu_phi_vnd, ma_don_thue),
        )
        cur.execute(
            "update public.xe set odo_hien_tai = greatest(odo_hien_tai, %s) where ma_xe = %s",
            (body.odo_nhan_xe, row["ma_xe"]),
        )
    xe = _lock_vehicle(conn, row["ma_xe"])
    return ReturnResult(
        don=get_order(conn, ma_don_thue),
        phi_tre=breakdown,
        can_bao_duong_sau_tra=needs_maintenance(xe["odo_hien_tai"], xe["odo_bao_duong_gan_nhat"], xe["nguong_km"]),
        km_tu_lan_bao_duong=km_since_maintenance(xe["odo_hien_tai"], xe["odo_bao_duong_gan_nhat"]),
    )


def close(conn: Connection, ma_don_thue: str, body: CloseRequest) -> CloseResult:
    row = _lock_by(conn, "ma_don_thue", ma_don_thue)
    if row["tt"] == "HoanTat":
        raise conflict("ALREADY_CLOSED", "Đơn đã hoàn tất trước đó")
    _require_state(row, ("DangThue",), "hoàn tất trả xe")
    if row["thoi_gian_tra_thuc_te"] is None or row["odo_nhan_xe"] is None:
        raise conflict("NOT_RETURNED", "Chưa ghi nhận ODO nhận xe và thời gian trả thực tế")
    if row["phu_phi_tre_han_vnd"] > 0 and not body.da_thu_phu_phi:
        raise invalid("FEE_NOT_COLLECTED", "Cần xác nhận đã thu phụ phí trả trễ trước khi đóng đơn")
    if row["tt_bd"] == "DaXacNhan" and not body.da_hoan_tra_bao_dam:
        raise invalid("DEPOSIT_NOT_RETURNED", "Cần xác nhận đã hoàn trả bảo đảm cho khách")
    xe = _lock_vehicle(conn, row["ma_xe"])
    new_status = status_after_close(xe["odo_hien_tai"], xe["odo_bao_duong_gan_nhat"], xe["nguong_km"])
    with conn.cursor() as cur:
        cur.execute(
            """update public.yeu_cau_thue
               set trang_thai_xu_ly = 'HoanTat',
                   trang_thai_bao_dam = case when trang_thai_bao_dam = 'DaXacNhan' then 'DaHoanTra'::public.trang_thai_bao_dam_enum
                                             else trang_thai_bao_dam end
               where ma_don_thue = %s""",
            (ma_don_thue,),
        )
        cur.execute("update public.xe set trang_thai = %s where ma_xe = %s", (new_status, row["ma_xe"]))
    return CloseResult(don=get_order(conn, ma_don_thue), trang_thai_xe_moi=new_status)

"""Hop dong API (request/response). Ten truong giu dung ten cot trong schema SQL.

- Thoi gian: ISO 8601 BAT BUOC co mui gio (AwareDatetime).
- Tien: so nguyen VND.
- ODO: so nguyen khong am, toi da 999999 (khop CHECK cua bang xe).
"""
from datetime import date, datetime
from typing import Generic, Literal, TypeVar

from pydantic import AwareDatetime, BaseModel, Field, field_validator, model_validator

from .domain.validation import clean_text, normalize_phone

LoaiXe = Literal["Manual", "Automatic"]
TrangThaiXe = Literal["KhaDung", "DangThue", "CanBaoDuong"]
TrangThaiXuLy = Literal["DaGui", "DaXacNhan", "DangThue", "HoanTat", "TuChoi"]
TrangThaiBaoDam = Literal["ChuaKiemTra", "DaXacNhan", "DaHoanTra"]
VaiTro = Literal["ChuCuaHang", "NhanVien"]
HinhThucNhanXe = Literal["TaiCuaHang", "GiaoTanNoi"]

Odo = Field(ge=0, le=999999)

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


# ---------- Nhan vien ----------
class StaffProfile(BaseModel):
    ma_nhan_vien: int
    ten_dang_nhap: str
    ho_ten: str
    vai_tro: VaiTro
    email: str | None = None


class StaffAccount(BaseModel):
    ma_nhan_vien: int
    ten_dang_nhap: str
    ho_ten: str
    vai_tro: VaiTro
    dang_hoat_dong: bool
    ngay_tao: datetime


# ---------- Bang gia / bao dam ----------
class RentalPrice(BaseModel):
    loai_xe: LoaiXe
    don_gia_ngay_vnd: int


class DepositMethod(BaseModel):
    ma_phuong_thuc: str
    ten_phuong_thuc: str
    dang_ap_dung: bool


# ---------- Xe ----------
class Vehicle(BaseModel):
    ma_xe: str
    ten_xe: str
    loai_xe: LoaiXe
    trang_thai: TrangThaiXe
    odo_hien_tai: int
    odo_bao_duong_gan_nhat: int
    ngay_bao_duong_gan_nhat: date | None
    nguong_km: int
    km_tu_lan_bao_duong: int
    can_bao_duong: bool
    don_gia_ngay_vnd: int


class OdoEvent(BaseModel):
    thoi_diem: datetime
    su_kien: Literal["GiaoXe", "NhanXe", "BaoDuong"]
    ma_don_thue: str | None
    odo: int
    quang_duong: int | None
    nguoi_ghi: str | None


class ActiveOrderBrief(BaseModel):
    ma_yeu_cau: str
    ma_don_thue: str | None
    trang_thai_xu_ly: TrangThaiXuLy
    ho_ten_khach: str
    thoi_gian_nhan_du_kien: datetime
    thoi_gian_tra_du_kien: datetime


class VehicleDetail(Vehicle):
    don_lien_quan: list[ActiveOrderBrief]
    lich_su_odo: list[OdoEvent]


class MaintenanceRecord(BaseModel):
    ma_lan_bao_duong: int
    ma_xe: str
    ngay_bao_duong: date
    odo_luc_bao_duong: int
    nguoi_ghi_nhan: int
    ten_nguoi_ghi_nhan: str
    ghi_chu: str | None
    thoi_diem_ghi_nhan: datetime


class MaintenanceCreate(BaseModel):
    ngay_bao_duong: date
    odo_luc_bao_duong: int = Odo
    ghi_chu: str | None = Field(default=None, max_length=255)

    @field_validator("ghi_chu")
    @classmethod
    def _clean(cls, v: str | None) -> str | None:
        return clean_text(v)


class MaintenanceCreated(BaseModel):
    ban_ghi: MaintenanceRecord
    xe: Vehicle
    moc_bao_duong_tiep_theo_km: int


# ---------- Yeu cau / don thue ----------
class RentalRequestCreate(BaseModel):
    ma_xe: str = Field(min_length=1, max_length=10)
    ho_ten_khach: str = Field(min_length=2, max_length=100)
    so_dien_thoai: str
    thoi_gian_nhan_du_kien: AwareDatetime
    thoi_gian_tra_du_kien: AwareDatetime
    ghi_chu_yeu_cau: str | None = Field(default=None, max_length=255)
    hinh_thuc_nhan_xe: HinhThucNhanXe = "TaiCuaHang"
    dia_chi_giao_xe: str | None = Field(default=None, max_length=255)

    @field_validator("ho_ten_khach")
    @classmethod
    def _name(cls, v: str) -> str:
        v2 = clean_text(v)
        if not v2 or len(v2) < 2:
            raise ValueError("Vui lòng nhập họ và tên")
        return v2

    @field_validator("so_dien_thoai")
    @classmethod
    def _phone(cls, v: str) -> str:
        return normalize_phone(v)

    @field_validator("ghi_chu_yeu_cau", "dia_chi_giao_xe")
    @classmethod
    def _text(cls, v: str | None) -> str | None:
        return clean_text(v)

    @model_validator(mode="after")
    def _check(self) -> "RentalRequestCreate":
        if self.thoi_gian_tra_du_kien <= self.thoi_gian_nhan_du_kien:
            raise ValueError("Thời gian trả phải sau thời gian nhận xe")
        if self.hinh_thuc_nhan_xe == "GiaoTanNoi" and not self.dia_chi_giao_xe:
            raise ValueError("Vui lòng nhập địa chỉ giao xe")
        if self.hinh_thuc_nhan_xe == "TaiCuaHang":
            self.dia_chi_giao_xe = None
        return self


class RentalRequestCreated(BaseModel):
    ma_yeu_cau: str
    trang_thai_xu_ly: TrangThaiXuLy
    thong_bao: str


class RentalRequest(BaseModel):
    ma_yeu_cau: str
    ma_don_thue: str | None
    ma_xe: str
    ten_xe: str
    loai_xe: LoaiXe
    ho_ten_khach: str
    so_dien_thoai: str
    ghi_chu_yeu_cau: str | None
    hinh_thuc_nhan_xe: HinhThucNhanXe
    dia_chi_giao_xe: str | None
    thoi_gian_nhan_du_kien: datetime
    thoi_gian_tra_du_kien: datetime
    thoi_diem_giao_xe: datetime | None
    thoi_gian_tra_thuc_te: datetime | None
    odo_giao_xe: int | None
    odo_nhan_xe: int | None
    quang_duong_luot_thue: int | None
    don_gia_ap_dung_vnd: int | None
    don_gia_hien_hanh_vnd: int
    so_ngay_thue: int
    tien_thue_du_kien_vnd: int
    ma_phuong_thuc_bao_dam: str | None
    ten_phuong_thuc_bao_dam: str | None
    trang_thai_bao_dam: TrangThaiBaoDam
    so_gio_tre: float
    ma_quy_tac_phi_tre: str | None
    he_so_phi_tre_ap_dung: float
    phu_phi_tre_han_vnd: int
    trang_thai_xu_ly: TrangThaiXuLy
    ly_do_tu_choi: str | None
    nguoi_xac_nhan: int | None
    ten_nguoi_xac_nhan: str | None
    co_trung_lich: bool
    ngay_tao: datetime
    ngay_cap_nhat: datetime


class ConfirmRequest(BaseModel):
    ma_phuong_thuc_bao_dam: str | None = Field(default=None, max_length=30)
    trang_thai_bao_dam: Literal["ChuaKiemTra", "DaXacNhan"] = "ChuaKiemTra"

    @model_validator(mode="after")
    def _check(self) -> "ConfirmRequest":
        if self.trang_thai_bao_dam == "DaXacNhan" and not self.ma_phuong_thuc_bao_dam:
            raise ValueError("Chọn hình thức bảo đảm trước khi ghi nhận Đã xác nhận")
        return self


class RejectRequest(BaseModel):
    ly_do: str = Field(min_length=3, max_length=255)

    @field_validator("ly_do")
    @classmethod
    def _clean(cls, v: str) -> str:
        v2 = clean_text(v)
        if not v2 or len(v2) < 3:
            raise ValueError("Vui lòng nhập lý do từ chối")
        return v2


class DepositUpdate(BaseModel):
    ma_phuong_thuc_bao_dam: str = Field(min_length=1, max_length=30)
    trang_thai_bao_dam: Literal["ChuaKiemTra", "DaXacNhan"]


class HandoverRequest(BaseModel):
    odo_giao_xe: int = Odo
    thoi_diem_giao_xe: AwareDatetime | None = None


class ReturnRequest(BaseModel):
    odo_nhan_xe: int = Odo
    thoi_gian_tra_thuc_te: AwareDatetime | None = None


class LateFeePreviewRequest(BaseModel):
    thoi_gian_tra_thuc_te: AwareDatetime


class LateFeeBreakdown(BaseModel):
    thoi_gian_tra_du_kien: datetime
    thoi_gian_tra_thuc_te: datetime
    so_phut_tre: int
    so_gio_tre: float
    ma_quy_tac: str
    mo_ta_muc: str
    he_so_ngay: float
    don_gia_ngay_vnd: int
    phu_phi_vnd: int


class ReturnResult(BaseModel):
    don: RentalRequest
    phi_tre: LateFeeBreakdown
    can_bao_duong_sau_tra: bool
    km_tu_lan_bao_duong: int


class CloseRequest(BaseModel):
    da_thu_phu_phi: bool
    da_hoan_tra_bao_dam: bool


class CloseResult(BaseModel):
    don: RentalRequest
    trang_thai_xe_moi: TrangThaiXe


class ConfirmResult(BaseModel):
    don: RentalRequest
    canh_bao: list[str]


# ---------- Cong khai ----------
class PublicVehicle(BaseModel):
    ma_xe: str
    ten_xe: str
    loai_xe: LoaiXe
    don_gia_ngay_vnd: int
    kha_dung: bool
    ly_do: str | None


class LookupRequest(BaseModel):
    ma_yeu_cau: str = Field(min_length=4, max_length=12)
    so_dien_thoai: str

    @field_validator("ma_yeu_cau")
    @classmethod
    def _code(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("so_dien_thoai")
    @classmethod
    def _phone(cls, v: str) -> str:
        return normalize_phone(v)


class LookupResult(BaseModel):
    ma_yeu_cau: str
    ma_don_thue: str | None
    trang_thai_xu_ly: TrangThaiXuLy
    ho_ten_khach: str
    ten_xe: str
    loai_xe: LoaiXe
    thoi_gian_nhan_du_kien: datetime
    thoi_gian_tra_du_kien: datetime
    hinh_thuc_nhan_xe: HinhThucNhanXe
    ly_do_tu_choi: str | None
    ngay_tao: datetime


# ---------- Dashboard ----------
class DashboardTask(BaseModel):
    loai: Literal["GiaoXe", "NhanXe"]
    thoi_diem: datetime
    qua_han: bool
    ma_yeu_cau: str
    ma_don_thue: str | None
    ho_ten_khach: str
    ma_xe: str
    ten_xe: str
    trang_thai_xu_ly: TrangThaiXuLy


class DashboardLateOrder(BaseModel):
    ma_don_thue: str
    ma_xe: str
    ten_xe: str
    loai_xe: LoaiXe
    thoi_gian_tra_du_kien: datetime
    thoi_gian_tra_thuc_te: datetime
    so_gio_tre: float
    he_so_phi_tre_ap_dung: float
    phu_phi_tre_han_vnd: int


class DashboardActivity(BaseModel):
    ma_yeu_cau: str
    ma_don_thue: str | None
    ho_ten_khach: str
    ma_xe: str
    trang_thai_xu_ly: TrangThaiXuLy
    ngay_cap_nhat: datetime


class DashboardSummary(BaseModel):
    tong_xe: int
    xe_theo_trang_thai: dict[str, int]
    xe_can_bao_duong: int
    yeu_cau_cho_xu_ly: int
    yeu_cau_trung_lich: int
    don_da_xac_nhan: int
    don_dang_thue: int
    don_qua_han_tra: int
    don_cho_dong: int
    viec_hom_nay: list[DashboardTask]
    xe_can_bao_duong_top: list[Vehicle]
    don_tra_tre: list[DashboardLateOrder]
    hoat_dong_gan_day: list[DashboardActivity]
    cap_nhat_luc: datetime

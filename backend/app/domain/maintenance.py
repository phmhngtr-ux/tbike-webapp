"""Quy tac bao duong BRULE-04: canh bao khi odo_hien_tai - odo_bao_duong_gan_nhat >= nguong_km."""


def km_since_maintenance(odo_hien_tai: int, odo_bao_duong_gan_nhat: int) -> int:
    return odo_hien_tai - odo_bao_duong_gan_nhat


def needs_maintenance(odo_hien_tai: int, odo_bao_duong_gan_nhat: int, nguong_km: int) -> bool:
    if nguong_km <= 0:
        raise ValueError("Ngưỡng bảo dưỡng phải lớn hơn 0")
    return km_since_maintenance(odo_hien_tai, odo_bao_duong_gan_nhat) >= nguong_km


def status_after_close(odo_hien_tai: int, odo_bao_duong_gan_nhat: int, nguong_km: int) -> str:
    """Trang thai xe khi dong don: khong tu chuyen KhaDung neu xe can bao duong."""
    return "CanBaoDuong" if needs_maintenance(odo_hien_tai, odo_bao_duong_gan_nhat, nguong_km) else "KhaDung"

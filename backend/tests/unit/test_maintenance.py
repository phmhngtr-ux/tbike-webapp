import pytest

from app.domain.maintenance import km_since_maintenance, needs_maintenance, status_after_close


@pytest.mark.parametrize("odo, last, expected", [
    (12999, 11000, False),  # duoi nguong 1.999 km
    (13000, 11000, True),   # dung 2.000 km
    (13100, 11000, True),   # vuot nguong
])
def test_threshold_2000(odo, last, expected):
    assert needs_maintenance(odo, last, 2000) is expected


def test_km_since():
    assert km_since_maintenance(15200, 13100) == 2100


def test_status_after_close_never_auto_available_when_due():
    assert status_after_close(13000, 11000, 2000) == "CanBaoDuong"
    assert status_after_close(12999, 11000, 2000) == "KhaDung"


def test_invalid_threshold():
    with pytest.raises(ValueError):
        needs_maintenance(1, 0, 0)

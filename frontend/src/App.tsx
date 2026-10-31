import { Link, Route, Routes } from "react-router-dom";
import { RequireStaff } from "./auth/RequireStaff";
import { HomePage } from "./pages/public/HomePage";
import { LookupPage } from "./pages/public/LookupPage";
import { RequestFormPage } from "./pages/public/RequestFormPage";
import { VehicleListPage } from "./pages/public/VehicleListPage";
import { ClosePage } from "./pages/staff/ClosePage";
import { DashboardPage } from "./pages/staff/DashboardPage";
import { ForbiddenPage } from "./pages/staff/ForbiddenPage";
import { HandoverPage } from "./pages/staff/HandoverPage";
import { LoginPage } from "./pages/staff/LoginPage";
import { MaintenancePage } from "./pages/staff/MaintenancePage";
import { OrderDetailPage } from "./pages/staff/OrderDetailPage";
import { RequestDetailPage } from "./pages/staff/RequestDetailPage";
import { RequestsPage } from "./pages/staff/RequestsPage";
import { ReturnPage } from "./pages/staff/ReturnPage";
import { VehicleDetailPage } from "./pages/staff/VehicleDetailPage";
import { VehiclesPage } from "./pages/staff/VehiclesPage";

/** Anh xa man hinh Figma -> route */
export function App() {
  return (
    <Routes>
      {/* Website khach */}
      <Route path="/" element={<HomePage />} />
      <Route path="/thue-xe" element={<VehicleListPage />} />{/* C0 */}
      <Route path="/thue-xe/:maXe/dat" element={<RequestFormPage />} />{/* C1 */}
      <Route path="/tra-cuu" element={<LookupPage />} />{/* C4b */}
      {/* Nhan vien */}
      <Route path="/nhan-vien/dang-nhap" element={<LoginPage />} />{/* A1 */}
      <Route element={<RequireStaff />}>
        <Route path="/nhan-vien" element={<DashboardPage />} />{/* A2 */}
        <Route path="/nhan-vien/xe" element={<VehiclesPage />} />{/* B1 */}
        <Route path="/nhan-vien/xe/:maXe" element={<VehicleDetailPage />} />{/* B2 */}
        <Route path="/nhan-vien/bao-duong" element={<MaintenancePage />} />{/* B3 */}
        <Route path="/nhan-vien/yeu-cau" element={<RequestsPage />} />{/* C2 */}
        <Route path="/nhan-vien/yeu-cau/:maYeuCau" element={<RequestDetailPage />} />{/* C3 */}
        <Route path="/nhan-vien/don/:maDon" element={<OrderDetailPage />} />{/* C4 */}
        <Route path="/nhan-vien/don/:maDon/giao-xe" element={<HandoverPage />} />{/* D1 */}
        <Route path="/nhan-vien/don/:maDon/nhan-xe" element={<ReturnPage />} />{/* D2 + D3 */}
        <Route path="/nhan-vien/don/:maDon/hoan-tat" element={<ClosePage />} />{/* D3 + D4 */}
        <Route path="/nhan-vien/khong-co-quyen" element={<ForbiddenPage />} />{/* A3 */}
      </Route>
      <Route path="*" element={
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-page p-6 text-center">
          <p className="text-eyebrow uppercase text-ink-muted">404</p>
          <h1 className="text-page text-ink">Không tìm thấy trang</h1>
          <Link to="/" className="font-semibold text-primary underline">Về trang chủ</Link>
        </div>} />
    </Routes>
  );
}

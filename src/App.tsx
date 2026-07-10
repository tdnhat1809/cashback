import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AdminLayout, DashboardLayout, PublicLayout } from './components/Layouts';

const Home = lazy(async () => ({ default: (await import('./pages/Home')).Home }));
const Deals = lazy(async () => ({ default: (await import('./pages/Deals')).Deals }));
const ProductDetail = lazy(async () => ({ default: (await import('./pages/ProductDetail')).ProductDetail }));
const LinkGenerator = lazy(async () => ({ default: (await import('./pages/LinkGenerator')).LinkGenerator }));
const Login = lazy(async () => ({ default: (await import('./pages/Login')).Login }));
const FAQ = lazy(async () => ({ default: (await import('./pages/FAQ')).FAQ }));
const NotFound = lazy(async () => ({ default: (await import('./pages/NotFound')).NotFound }));

const Overview = lazy(async () => ({ default: (await import('./pages/dashboard/Overview')).Overview }));
const CashbackHistory = lazy(async () => ({ default: (await import('./pages/dashboard/CashbackHistory')).CashbackHistory }));
const Withdrawal = lazy(async () => ({ default: (await import('./pages/dashboard/Withdrawal')).Withdrawal }));
const SavedProducts = lazy(async () => ({ default: (await import('./pages/dashboard/SavedProducts')).SavedProducts }));
const Referral = lazy(async () => ({ default: (await import('./pages/dashboard/Referral')).Referral }));
const Rewards = lazy(async () => ({ default: (await import('./pages/dashboard/Rewards')).Rewards }));
const Settings = lazy(async () => ({ default: (await import('./pages/dashboard/Settings')).Settings }));
const ShipmentTracking = lazy(async () => ({ default: (await import('./pages/dashboard/ShipmentTracking')).ShipmentTracking }));
const ShipmentDetail = lazy(async () => ({ default: (await import('./pages/dashboard/ShipmentDetail')).ShipmentDetail }));
const BalanceHistory = lazy(async () => ({ default: (await import('./pages/dashboard/OtherDashboardPages')).BalanceHistory }));
const ActivityLog = lazy(async () => ({ default: (await import('./pages/dashboard/OtherDashboardPages')).ActivityLog }));
const Notifications = lazy(async () => ({ default: (await import('./pages/dashboard/OtherDashboardPages')).Notifications }));
const Giftcode = lazy(async () => ({ default: (await import('./pages/dashboard/OtherDashboardPages')).Giftcode }));

const AdminOverview = lazy(async () => ({ default: (await import('./pages/admin/AdminOverview')).AdminOverview }));
const AdminManagement = lazy(async () => ({ default: (await import('./pages/admin/AdminManagement')).AdminManagement }));

const RouteLoader = () => (
  <div className="min-h-[65vh] max-w-[1280px] mx-auto px-5 py-10" aria-label="Đang tải nội dung">
    <div className="h-7 w-48 rounded-lg bg-surface-container animate-pulse" />
    <div className="mt-7 grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="h-52 rounded-2xl bg-surface-container-low animate-pulse" />
      ))}
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/deals" element={<PublicLayout><Deals /></PublicLayout>} />
          <Route path="/product/:id" element={<PublicLayout><ProductDetail /></PublicLayout>} />
          <Route path="/link-generator" element={<PublicLayout><LinkGenerator /></PublicLayout>} />
          <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
          <Route path="/faq" element={<PublicLayout><FAQ /></PublicLayout>} />

          <Route path="/dashboard" element={<DashboardLayout><Overview /></DashboardLayout>} />
          <Route path="/dashboard/cashback" element={<DashboardLayout><CashbackHistory /></DashboardLayout>} />
          <Route path="/dashboard/withdrawal" element={<DashboardLayout><Withdrawal /></DashboardLayout>} />
          <Route path="/dashboard/shipment" element={<DashboardLayout><ShipmentTracking /></DashboardLayout>} />
          <Route path="/dashboard/shipment/:id" element={<DashboardLayout><ShipmentDetail /></DashboardLayout>} />
          <Route path="/dashboard/saved" element={<DashboardLayout><SavedProducts /></DashboardLayout>} />
          <Route path="/dashboard/referral" element={<DashboardLayout><Referral /></DashboardLayout>} />
          <Route path="/dashboard/rewards" element={<DashboardLayout><Rewards /></DashboardLayout>} />
          <Route path="/dashboard/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
          <Route path="/dashboard/ledger" element={<DashboardLayout><BalanceHistory /></DashboardLayout>} />
          <Route path="/dashboard/logs" element={<DashboardLayout><ActivityLog /></DashboardLayout>} />
          <Route path="/dashboard/notifications" element={<DashboardLayout><Notifications /></DashboardLayout>} />
          <Route path="/dashboard/giftcode" element={<DashboardLayout><Giftcode /></DashboardLayout>} />

          <Route path="/admin" element={<AdminLayout><AdminOverview /></AdminLayout>} />
          <Route path="/admin/management" element={<AdminLayout><AdminManagement /></AdminLayout>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;

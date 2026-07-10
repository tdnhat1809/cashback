import React from 'react';
import { CircleHelp, Home, ShoppingCart, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';

const illustration = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvrePhzAUBXYm8NtLqrzTwMkpR9_b53OGEIFlR0T8SEOhAhdm0AmMUHu0R2MueOP2ekJS0aK-IS3JtiYKbDwdTK8NkRlRW5G_l_XuEnKTv6s864jW1zlXkYCS1zYS_KVbIG_yJ08fPHC87AfnX7dp8oi_HZG1zC6R3Ih4a3GQHCgPgSfyYkI540heYY-X__l_lqdYwsXGeGm9UwFqVYPmvvJK8UgWepeHGJCnuqG0Pvbr9sUysB_38nQ';

export const NotFound: React.FC = () => (
  <div className="bg-background">
    <section className="max-w-[1080px] mx-auto px-5 sm:px-6 py-14 sm:py-20 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 items-center min-h-[650px]">
      <div className="order-2 md:order-1">
        <img
          src={illustration}
          alt="Robot HOANTIENVIP đang tìm kiếm deal"
          className="w-full max-w-[390px] aspect-square object-contain mx-auto"
        />
      </div>
      <div className="order-1 md:order-2 text-center md:text-left">
        <p className="text-primary text-xs sm:text-sm font-black tracking-[0.16em] uppercase">Lỗi 404 · Không tìm thấy</p>
        <h1 className="mt-3 text-[38px] sm:text-[52px] leading-[1.08] font-black tracking-[-0.04em] text-on-surface text-balance">
          Ồ! Có vẻ deal này đã “bay màu”.
        </h1>
        <p className="mt-5 text-sm sm:text-lg leading-7 text-on-surface-variant max-w-[560px]">
          Trang bạn đang tìm không tồn tại hoặc đã được di chuyển. Vẫn còn hàng nghìn deal hoàn tiền đang chờ bạn khám phá.
        </p>
        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
          <Link to="/deals" className="min-h-14 px-6 rounded-2xl bg-primary-container text-white font-bold inline-flex items-center justify-center gap-2 shadow-[0_10px_24px_rgba(255,90,54,0.22)] hover:brightness-105 active:scale-[0.98] transition-all">
            <ShoppingCart size={20} /> Khám phá deal hot
          </Link>
          <Link to="/" className="min-h-14 px-6 rounded-2xl border-2 border-outline-variant bg-white/50 text-on-surface font-bold inline-flex items-center justify-center gap-2 hover:border-primary/40 active:scale-[0.98] transition-all">
            <Home size={20} /> Quay lại trang chủ
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-8">
          <Link to="/faq" className="rounded-2xl border border-primary/15 bg-surface-container-low p-4 text-left hover:bg-surface-container transition-colors">
            <CircleHelp size={20} className="text-primary" />
            <span className="block mt-2 text-sm font-bold">Trung tâm hỗ trợ</span>
            <span className="block text-xs text-on-surface-variant mt-1">Giải đáp thắc mắc</span>
          </Link>
          <Link to="/dashboard/withdrawal" className="rounded-2xl border border-primary/15 bg-surface-container-low p-4 text-left hover:bg-surface-container transition-colors">
            <WalletCards size={20} className="text-tertiary" />
            <span className="block mt-2 text-sm font-bold">Rút tiền ngay</span>
            <span className="block text-xs text-on-surface-variant mt-1">Thanh khoản nhanh</span>
          </Link>
        </div>
      </div>
    </section>
  </div>
);

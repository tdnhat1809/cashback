import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronDown,
  Heart,
  RotateCcw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { Pagination } from '../components/Pagination';
import { EmptyState } from '../components/EmptyState';
import type { Product } from '../mockData';
import { catalogApi, userFeaturesApi, type DealProduct } from '../services/apiClient';

type DealFilter =
  | 'all'
  | 'Shopee'
  | 'TikTok Shop'
  | 'under10k'
  | 'freeship'
  | 'high_cashback';

const ITEMS_PER_PAGE = 10;

const filterChips: Array<{ value: DealFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'Shopee', label: 'Shopee' },
  { value: 'TikTok Shop', label: 'TikTok Shop' },
  { value: 'under10k', label: 'Dưới 10K' },
  { value: 'freeship', label: 'Freeship' },
  { value: 'high_cashback', label: 'Hoa hồng cao' },
];

const sortOptions = [
  { value: 'default', label: 'Phổ biến' },
  { value: 'discount_desc', label: 'Giảm giá cao' },
  { value: 'cashback_desc', label: 'Cashback cao' },
  { value: 'price_asc', label: 'Giá thấp nhất' },
  { value: 'price_desc', label: 'Giá cao nhất' },
];

const normalizePlatform = (value: string | null): DealFilter | null => {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'shopee') return 'Shopee';
  if (normalized === 'tiktok' || normalized === 'tiktok shop') return 'TikTok Shop';
  return null;
};

const normalizeDealFilter = (value: string | null): DealFilter | null => {
  if (value === 'under10k' || value === 'freeship' || value === 'high_cashback') {
    return value;
  }
  return null;
};

const formatPrice = (value: number) => `${value.toLocaleString('vi-VN')}đ`;

const toProduct = (deal: DealProduct): Product => {
  const cashbackValue = deal.commission_rate_bps
    ? Math.floor((deal.price_vnd * deal.commission_rate_bps * 0.9) / 10_000)
    : 0;
  return {
    id: deal.id,
    name: deal.name,
    price: deal.price_vnd,
    originalPrice: deal.original_price_vnd,
    cashbackText: cashbackValue > 0 ? `Hoàn ${cashbackValue.toLocaleString('vi-VN')}đ` : 'Đang cập nhật',
    cashbackValue,
    platform: deal.platform === 'shopee' ? 'Shopee' : 'TikTok Shop',
    category: deal.price_vnd <= 10_000 ? 'under10k' : cashbackValue >= 20_000 ? 'high_cashback' : 'home',
    imageUrl: deal.image_url ?? '',
    shopName: deal.shop_name ?? (deal.platform === 'shopee' ? 'Shopee' : 'TikTok Shop'),
    sourceUrl: deal.source_url,
    coupons: [],
    terms: deal.platform === 'tiktok' ? 'TikTok Shop hiện ở chế độ mô phỏng, chưa ghi nhận cashback.' : undefined,
  };
};

interface DealCardProps {
  product: Product;
  onBuy: (product: Product) => void;
  onSave: (id: string) => void;
}

const DesktopDealCard: React.FC<DealCardProps> = ({ product, onBuy, onSave }) => (
  <article className="group relative hidden h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-outline-variant/30 bg-white shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-md md:flex">
    <div className="relative aspect-square overflow-hidden bg-surface-container-low">
      {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" /> : <span className="flex h-full items-center justify-center text-sm font-black text-primary">{product.platform === 'Shopee' ? 'S' : 'TT'}</span>}
      <span className="absolute right-2 top-2 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
        {product.cashbackText}
      </span>
      <button
        type="button"
        onClick={() => onSave(product.id)}
        aria-label={product.saved ? `Bỏ lưu ${product.name}` : `Lưu ${product.name}`}
        aria-pressed={Boolean(product.saved)}
        className={`absolute left-2 top-2 flex size-10 cursor-pointer items-center justify-center rounded-full border shadow-sm backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          product.saved
            ? 'border-primary bg-primary text-white'
            : 'border-white/70 bg-white/90 text-on-surface-variant hover:text-primary'
        }`}
      >
        <Heart size={17} fill={product.saved ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
    </div>

    <div className="flex flex-1 flex-col p-4">
      <div className="mb-2 flex min-w-0 items-center gap-1.5">
        <ShoppingBag
          size={15}
          className={product.platform === 'Shopee' ? 'text-primary-container' : 'text-on-surface'}
          aria-hidden="true"
        />
        <span className="truncate text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
          {product.platform === 'Shopee' ? 'Shopee Mall' : 'TikTok Shop'}
        </span>
      </div>

      <h2 className="mb-3 line-clamp-2 min-h-11 text-[15px] font-bold leading-snug text-on-surface transition-colors group-hover:text-primary">
        {product.name}
      </h2>

      <div className="mt-auto">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-lg font-extrabold tabular-nums text-primary">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice > product.price && (
            <span className="text-[11px] tabular-nums text-on-surface-variant/70 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onBuy(product)}
          className="min-h-11 w-full cursor-pointer rounded-xl bg-primary-container px-3 py-2.5 text-xs font-extrabold uppercase text-white shadow-sm transition-[filter,transform] duration-200 hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Mua ngay
        </button>
      </div>
    </div>
  </article>
);

const MobileDealCard: React.FC<DealCardProps> = ({ product, onBuy, onSave }) => (
  <article className="relative overflow-hidden rounded-2xl border border-outline-variant/30 bg-white shadow-sm md:hidden">
    <button
      type="button"
      onClick={() => onBuy(product)}
      aria-label={`Xem deal ${product.name}`}
      className="grid min-h-32 w-full cursor-pointer grid-cols-[7rem_minmax(0,1fr)] text-left transition-colors active:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:grid-cols-[8rem_minmax(0,1fr)]"
    >
      <span className="relative block h-full min-h-32 overflow-hidden bg-surface-container-low">
        {product.imageUrl ? <img src={product.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /> : <span className="flex h-full items-center justify-center text-sm font-black text-primary">{product.platform === 'Shopee' ? 'S' : 'TT'}</span>}
        <span className="absolute right-2 top-2 rounded-full bg-primary-container px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
          Hot
        </span>
      </span>

      <span className="flex min-w-0 flex-col justify-between p-3.5">
        <span>
          <span className="mb-1 flex items-start justify-between gap-2">
            <span className={`text-[11px] font-bold uppercase tracking-wide ${product.platform === 'Shopee' ? 'text-primary' : 'text-secondary'}`}>
              {product.platform}
            </span>
            <span className="flex shrink-0 items-center gap-1 text-[11px] font-extrabold text-tertiary">
              <Sparkles size={13} aria-hidden="true" />
              {product.cashbackText.replace('Hoàn ', '+')}
            </span>
          </span>
          <span className="line-clamp-2 text-[15px] font-bold leading-snug text-on-surface">
            {product.name}
          </span>
        </span>

        <span className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-lg font-extrabold tabular-nums text-primary">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice > product.price && (
            <span className="text-[11px] tabular-nums text-on-surface-variant/60 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </span>
      </span>
    </button>

    <button
      type="button"
      onClick={() => onSave(product.id)}
      aria-label={product.saved ? `Bỏ lưu ${product.name}` : `Lưu ${product.name}`}
      aria-pressed={Boolean(product.saved)}
      className={`absolute left-2 top-2 z-10 flex size-10 cursor-pointer items-center justify-center rounded-full border shadow-sm backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        product.saved
          ? 'border-primary bg-primary text-white'
          : 'border-white/70 bg-white/90 text-on-surface-variant hover:text-primary'
      }`}
    >
      <Heart size={16} fill={product.saved ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  </article>
);

export const Deals: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedFilter =
    normalizePlatform(searchParams.get('platform')) ??
    normalizeDealFilter(searchParams.get('filter')) ??
    'all';
  const [products, setProducts] = useState<Product[]>([]);
  const [dataError, setDataError] = useState('');
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [activeFilter, setActiveFilter] = useState<DealFilter>(requestedFilter);
  const [sortOrder, setSortOrder] = useState('default');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setActiveFilter(requestedFilter);
    setCurrentPage(1);
  }, [requestedFilter]);

  useEffect(() => {
    const platform = activeFilter === 'Shopee' ? 'shopee' : activeFilter === 'TikTok Shop' ? 'tiktok' : undefined;
    void (async () => {
      setDataError('');
      try {
        const results = platform
          ? [await catalogApi.listDeals({ platform })]
          : await Promise.all([catalogApi.listDeals({ platform: 'shopee' }), catalogApi.listDeals({ platform: 'tiktok' })]);
        setProducts(results.flat().map(toProduct));
      } catch (error) {
        setProducts([]);
        setDataError(error instanceof Error ? error.message : 'Không thể tải danh sách deal.');
      }
    })();
  }, [activeFilter]);

  const handleSaveProduct = async (id: string) => {
    try {
      const result = await userFeaturesApi.toggleSavedProduct(id);
      setProducts((current) => current.map((product) => product.id === id ? { ...product, saved: result.saved } : product));
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Bạn cần đăng nhập để lưu sản phẩm.');
    }
  };

  const handleBuyProduct = (product: Product) => {
    if (product.sourceUrl) {
      navigate(`/link-generator?url=${encodeURIComponent(product.sourceUrl)}`);
      return;
    }
    navigate(`/product/${product.id}`);
  };

  const handleFilterChange = (filter: DealFilter) => {
    setActiveFilter(filter);
    setCurrentPage(1);

    const nextParams = new URLSearchParams(searchParams);
    if (filter === 'Shopee' || filter === 'TikTok Shop') {
      nextParams.set('platform', filter);
      nextParams.delete('filter');
    } else if (filter === 'under10k' || filter === 'freeship' || filter === 'high_cashback') {
      nextParams.set('filter', filter);
      nextParams.delete('platform');
    } else {
      nextParams.delete('platform');
      nextParams.delete('filter');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const resetFilters = () => {
    setSearch('');
    setActiveFilter('all');
    setSortOrder('default');
    setCurrentPage(1);
    setSearchParams({}, { replace: true });
  };

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('vi');

    return products
      .filter((product) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          product.name.toLocaleLowerCase('vi').includes(normalizedSearch) ||
          product.shopName.toLocaleLowerCase('vi').includes(normalizedSearch);

        let matchesFilter = true;
        if (activeFilter === 'Shopee' || activeFilter === 'TikTok Shop') {
          matchesFilter = product.platform === activeFilter;
        } else if (activeFilter === 'under10k') {
          matchesFilter = product.category === 'under10k' || product.price <= 10_000;
        } else if (activeFilter === 'freeship') {
          matchesFilter = Boolean(
            product.coupons?.some((coupon) => coupon.toLocaleLowerCase('vi').includes('freeship')),
          );
        } else if (activeFilter === 'high_cashback') {
          matchesFilter = product.category === 'high_cashback';
        }

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (sortOrder === 'price_asc') return a.price - b.price;
        if (sortOrder === 'price_desc') return b.price - a.price;
        if (sortOrder === 'cashback_desc') return b.cashbackValue - a.cashbackValue;
        if (sortOrder === 'discount_desc') {
          const discountA = (a.originalPrice - a.price) / a.originalPrice;
          const discountB = (b.originalPrice - b.price) / b.originalPrice;
          return discountB - discountA;
        }
        return 0;
      });
  }, [activeFilter, products, search, sortOrder]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const hasActiveFilters = activeFilter !== 'all' || search.trim() !== '' || sortOrder !== 'default';

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 text-left sm:px-6 sm:py-10 lg:py-12">
      <header className="mb-6 sm:mb-8">
        <h1 className="mb-1 text-2xl font-black tracking-tight text-on-surface sm:text-3xl">
          {search.trim() ? `Kết quả tìm kiếm cho “${search.trim()}”` : 'Deal hot hôm nay'}
        </h1>
        <p className="text-sm text-on-surface-variant sm:text-base">
          Tìm thấy <strong className="font-bold text-on-surface">{filteredProducts.length}</strong> ưu đãi hấp dẫn từ Shopee và TikTok Shop.
        </p>
      </header>

      {dataError && <p className="mb-5 rounded-xl border border-error/20 bg-error-container/20 p-3 text-sm text-error" role="alert">{dataError}</p>}

      <section aria-label="Tìm kiếm và lọc deal" className="mb-7 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <label htmlFor="deal-search" className="sr-only">
              Tìm theo tên sản phẩm hoặc cửa hàng
            </label>
            <Search
              size={19}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-outline"
              aria-hidden="true"
            />
            <input
              id="deal-search"
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm deal ngon, sản phẩm hoặc cửa hàng..."
              className="min-h-12 w-full rounded-2xl border border-transparent bg-surface-container-low py-3 pl-11 pr-4 text-base text-on-surface outline-none transition-[background-color,border-color,box-shadow] placeholder:text-on-surface-variant/70 focus:border-primary/30 focus:bg-white focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <span className="text-sm font-medium text-on-surface-variant">Sắp xếp:</span>
            <div className="relative">
              <label htmlFor="deal-sort" className="sr-only">
                Sắp xếp danh sách deal
              </label>
              <select
                id="deal-sort"
                value={sortOrder}
                onChange={(event) => {
                  setSortOrder(event.target.value);
                  setCurrentPage(1);
                }}
                className="min-h-11 cursor-pointer appearance-none rounded-xl border border-outline-variant/50 bg-white py-2 pl-4 pr-10 text-sm font-bold text-primary outline-none transition-colors hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Bộ lọc nhanh">
          <div className="flex min-w-max items-center gap-2">
            {filterChips.map((chip) => {
              const isActive = activeFilter === chip.value;
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => handleFilterChange(chip.value)}
                  aria-pressed={isActive}
                  className={`flex min-h-11 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition-[background-color,border-color,color,transform] duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    isActive
                      ? 'border-primary-container bg-primary-container text-white shadow-sm'
                      : 'border-outline-variant/70 bg-white text-on-surface-variant hover:border-primary hover:text-primary'
                  }`}
                >
                  {chip.value === 'all' && <SlidersHorizontal size={16} aria-hidden="true" />}
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mb-4 flex items-center justify-between md:hidden">
        <p className="text-xs font-semibold text-on-surface-variant" aria-live="polite">
          {filteredProducts.length} kết quả{search.trim() ? ` cho “${search.trim()}”` : ''}
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-2 text-xs font-bold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <RotateCcw size={15} aria-hidden="true" />
            Xóa bộ lọc
          </button>
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <EmptyState 
          variant="deal-search"
          onAction={resetFilters}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
            {paginatedProducts.map((product) => (
              <React.Fragment key={product.id}>
                <DesktopDealCard product={product} onSave={handleSaveProduct} onBuy={handleBuyProduct} />
                <MobileDealCard product={product} onSave={handleSaveProduct} onBuy={handleBuyProduct} />
              </React.Fragment>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
};

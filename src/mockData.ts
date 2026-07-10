export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  cashbackText: string;
  cashbackValue: number; // in VND
  platform: 'Shopee' | 'TikTok Shop';
  category: 'electronics' | 'home' | 'beauty' | 'fashion' | 'under10k' | 'high_cashback';
  imageUrl: string;
  shopName: string;
  coupons?: string[];
  terms?: string;
  saved?: boolean;
}

export interface CashbackOrder {
  id: string;
  orderId: string;
  platform: 'Shopee' | 'TikTok Shop';
  shopName: string;
  productName: string;
  productImg: string;
  orderValue: number;
  cashbackEstimate: number;
  cashbackActual: number;
  status: 'Pending' | 'Confirmed' | 'Rejected' | 'Paid';
  date: string;
  reason?: string;
}

export interface LedgerEntry {
  id: string;
  type: 'cashback_received' | 'referral_bonus' | 'withdrawal' | 'refund';
  amount: number; // positive or negative
  date: string;
  description: string;
  balanceAfter: number;
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  date: string;
  transactionCode?: string;
}

export interface ShipmentEvent {
  date: string;
  time: string;
  location: string;
  description: string;
  status: 'CREATED' | 'PICKED_UP' | 'IN_TRANSIT' | 'AT_SORTING_HUB' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'DELIVERY_FAILED' | 'RETURNING' | 'RETURNED' | 'CANCELLED' | 'EXCEPTION' | 'UNKNOWN';
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  carrier: string;
  latestStatus: string;
  lastSynced: string;
  estimateDelivery?: string;
  events: ShipmentEvent[];
}

export interface RewardTask {
  id: string;
  title: string;
  reward: number; // in Xu
  completed: boolean;
  type: 'daily' | 'once';
}

export interface RewardGift {
  id: string;
  title: string;
  cost: number; // in Xu
  imageUrl: string;
  stock: number;
}

export interface UserProfile {
  name: string;
  phone: string;
  email: string;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  referralCode: string;
  registrationDate: string;
}

export interface SupportMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  senderName: string;
  text: string;
  time: string;
  imageUrl?: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  status: 'Open' | 'Resolved' | 'Closed';
  priority: 'Low' | 'Medium' | 'High';
  category: string;
  linkedOrder?: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
}

export interface CashbackRule {
  id: string;
  category: string;
  platform: 'Shopee' | 'TikTok Shop';
  type: 'Mall' | 'Marketplace' | 'International' | 'Supermarket';
  sourceCommission: number;
  pitTax: number;
  userCashback: number;
  approvalDays: number;
  effectiveDate: string;
  status: 'Active' | 'Expired';
  notes?: string;
}

export interface AdminPromoCode {
  id: string;
  code: string;
  description: string;
  type: 'cashback' | 'points' | 'flat';
  value: number;
  usedCount: number;
  limitCount: number;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Expired' | 'Scheduled';
}

export interface AdminReferralCampaign {
  id: string;
  name: string;
  rewardPerUser: number;
  totalJoined: number;
  status: 'Active' | 'Completed' | 'Draft';
  startDate: string;
  endDate: string;
}

export interface AdminStaffMember {
  id: string;
  name: string;
  role: 'Admin' | 'CSKH' | 'Operation' | 'Finance';
  avatar: string;
  status: 'Active' | 'Offline' | 'Suspended';
  lastActive: string;
  twoFaEnabled: boolean;
}

export interface AdminSecurityLog {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  target: string;
  ip: string;
  timestamp: string;
}

export interface AdminPromoBanner {
  id: string;
  title: string;
  imageUrl: string;
  link: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Expired';
}

export interface AdminPushNotification {
  id: string;
  title: string;
  body: string;
  target: string;
  sentCount: number;
  status: 'Delivered' | 'Scheduled' | 'Draft';
  scheduleTime?: string;
  sentDate?: string;
}

// 1. Products and Deals
export const mockProducts: Product[] = [
  {
    id: 'p1',
    name: 'Tai Nghe Không Dây Bluetooth 5.3 Pro Chống Ồn Active Noise Cancelling',
    price: 199000,
    originalPrice: 350000,
    cashbackText: 'Hoàn 15.000đ',
    cashbackValue: 15000,
    platform: 'Shopee',
    category: 'electronics',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBN1ON5K24LxO--mpXzHQ68mNEgo_VvD_bx_EenXc4XIJNNyKkIH9MfwOImCE1_aNnjo4qP__nSA5gaYZ_L3hDhC_qzsUBfQV8AE_I8O-DTb0QuBsEzNni34D91hBL5bWLVFTLNTBAkLaaNQLwelbP4b4TCpWoup9PfjqLkx5OdLa39jAwZmDM-yBoUNefH6mbSRi7wwyiLZ4kz27cIbZvPQ7yyTxyJkLEKSnA57pMvLwIm7k_Roe--Dg',
    shopName: 'Baseus Official Store',
    coupons: ['Mã giảm 20K', 'Freeship Xtra'],
    terms: 'Không hoàn tiền nếu đơn bị hủy hoặc hoàn trả. Chỉ áp dụng hoàn tiền cho khách hàng mua qua link hoàn tiền và thanh toán thành công.',
    saved: true
  },
  {
    id: 'p2',
    name: 'Máy Phun Sương Tạo Ẩm Tinh Dầu Cao Cấp Siêu Âm Tự Động Tắt',
    price: 145000,
    originalPrice: 280000,
    cashbackText: 'Hoàn 12.000đ',
    cashbackValue: 12000,
    platform: 'TikTok Shop',
    category: 'home',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDcdvW35RELtG6k8yR6pJAyK4s_fC23BJQTJjF-jLpLNf4gO4Vvt2LMsoqVfEN59gFmZMt4BzuFZ1FUg0UdkBzLujq8fxmLXegV1hK8N94ANSpH9_3TtMjc166sx9jp-fA9p_fRf-Wbi3GcePcj2al2_2rrspv3iPp6gt13FsFFlpUSZ3T3xLdc7JS1kjFADtS3i5-J5vWDkzhh48cl8n50kwDP0qsiKNqzxAC-EwdunplHw',
    shopName: 'Muji Vietnam',
    coupons: ['Giảm 10%', 'Mã Freeship'],
    terms: 'Chỉ ghi nhận hoàn tiền khi hoàn tất nhận hàng và không phát sinh khiếu nại trong 7 ngày.',
    saved: false
  },
  {
    id: 'p3',
    name: 'Đèn Học Chống Cận Thị Tích Hợp Sạc Không Dây Thông Minh 3 Chế Độ Sáng',
    price: 285000,
    originalPrice: 450000,
    cashbackText: 'Hoàn 25.000đ',
    cashbackValue: 25000,
    platform: 'Shopee',
    category: 'home',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwDzSuIbKykqRn9FSBonBmkn7jsv5MQBxbNoemTAtfX-UWEQSLrQZOPA7XMiEmRUQ4-MjQDNjNMjgT1Z7fe3QlH70EhhgCFyL8Uq4tPkcDSRzdoPJaeNy0-X7RSp8HwBKWL3dOH3jTUZ7JguLjOnNW2kdrO2xjD7CtOCSvC12huSBqu7UEAcNfNOJji-s9T2incZ79l75PyZ_UvIfdQ0b0Jx76pP4AFUL3yhe6fRMMd6uljmHTW8Ukkg',
    shopName: 'Rạng Đông Mall',
    coupons: ['Mã giảm 30K'],
    terms: 'Không áp dụng kèm các voucher giảm giá đặc biệt khác từ sàn hoặc của shop lớn.',
    saved: true
  },
  {
    id: 'p4',
    name: 'Bộ Chăm Sóc Da Toàn Diện Organic Tự Nhiên Dưỡng Ẩm Chống Lão Hóa',
    price: 120000,
    originalPrice: 199000,
    cashbackText: 'Hoàn 8.500đ',
    cashbackValue: 8500,
    platform: 'TikTok Shop',
    category: 'beauty',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuClBHLNmc6rEg_rlhREvk63WnSymf1gHRjqt4udmMQ2_9d2AAJrpw8NgX4BGruqv-f3o-_HDmP48yelMzn1sudxGHA0Q7JYMlLv-5Z7OPbGEwEh19LTPWHTC_ycWDrFL9isT87UYIeQYIU0E196Pn1o2zJdPWyBPsUbQgrzWEf9qxaZZdu9yDdpUoJgtcbXEgeKhOiB_XfjaceacdDlE4cgeA7LXP2jHvtJPNFsZNKUAhJ596YI1FNYCg',
    shopName: 'Innisfree Official',
    coupons: ['Mã giảm 15K', 'Follower Shop giảm 10K'],
    terms: 'Áp dụng cho mọi đối tượng khách hàng cũ và mới trên nền tảng TikTok Shop.',
    saved: false
  },
  {
    id: 'p5',
    name: 'Dây Sạc Nhanh Type-C To Lightning Tự Ngắt Chống Đứt Gãy 1.2m',
    price: 9000,
    originalPrice: 25000,
    cashbackText: 'Hoàn 800đ',
    cashbackValue: 800,
    platform: 'Shopee',
    category: 'under10k',
    imageUrl: 'https://images.unsplash.com/photo-1541667590924-a85970c0c165?w=500&auto=format&fit=crop&q=60',
    shopName: 'Phụ Kiện Điện Thoại Giá Sỉ',
    coupons: ['Freeship 0đ'],
    terms: 'Sản phẩm giá trị nhỏ. Hoàn tiền dựa trên giá trị thực tế sau khi trừ đi các mã giảm giá của sàn.',
    saved: false
  },
  {
    id: 'p6',
    name: 'Móc Khóa Da Handmade Khắc Tên Theo Yêu Cầu Sang Trọng',
    price: 8500,
    originalPrice: 15000,
    cashbackText: 'Hoàn 600đ',
    cashbackValue: 600,
    platform: 'TikTok Shop',
    category: 'under10k',
    imageUrl: 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=500&auto=format&fit=crop&q=60',
    shopName: 'Da Thật Việt Nam',
    coupons: [],
    terms: 'Chỉ áp dụng hoàn tiền cho các đơn hàng hoàn tất thanh toán trước.',
    saved: false
  },
  {
    id: 'p7',
    name: 'Kem Chống Nắng Kiềm Dầu Nâng Tông Tự Nhiên SPF 50+ La Roche-Posay',
    price: 395000,
    originalPrice: 495000,
    cashbackText: 'Hoàn 45.000đ',
    cashbackValue: 45000,
    platform: 'Shopee',
    category: 'high_cashback',
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=60',
    shopName: 'La Roche-Posay Official Store',
    coupons: ['Giảm 40K', 'Quà tặng kèm'],
    terms: 'Chỉ áp dụng hoàn tiền cho gian hàng chính hãng LazMall/Shopee Mall.',
    saved: false
  },
  {
    id: 'p8',
    name: 'Bình Giữ Nhiệt Lõi Inox 316 Cao Cấp Giữ Nhiệt 24 Tiếng Lock&Lock 500ml',
    price: 320000,
    originalPrice: 520000,
    cashbackText: 'Hoàn 35.000đ',
    cashbackValue: 35000,
    platform: 'TikTok Shop',
    category: 'high_cashback',
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&auto=format&fit=crop&q=60',
    shopName: 'Lock&Lock Vietnam',
    coupons: ['Giảm 25K', 'Freeship Xtra'],
    terms: 'Hoàn tiền tính trên giá bán thực tế sau khi trừ đi các mã giảm giá của sàn.',
    saved: false
  }
];

// 2. Cashback Orders
export const mockCashbackOrders: CashbackOrder[] = [
  {
    id: 'o1',
    orderId: 'SP-992384210',
    platform: 'Shopee',
    shopName: 'Baseus Official Store',
    productName: 'Tai Nghe Không Dây Bluetooth 5.3 Pro Chống Ồn',
    productImg: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&auto=format&fit=crop&q=60',
    orderValue: 199000,
    cashbackEstimate: 15000,
    cashbackActual: 15000,
    status: 'Paid',
    date: '2026-06-25 14:32'
  },
  {
    id: 'o2',
    orderId: 'TT-443219082',
    platform: 'TikTok Shop',
    shopName: 'Innisfree Official',
    productName: 'Bộ Chăm Sóc Da Toàn Diện Organic Tự Nhiên Dưỡng Ẩm',
    productImg: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=100&auto=format&fit=crop&q=60',
    orderValue: 120000,
    cashbackEstimate: 8500,
    cashbackActual: 8500,
    status: 'Confirmed',
    date: '2026-07-02 09:15'
  },
  {
    id: 'o3',
    orderId: 'SP-883210943',
    platform: 'Shopee',
    shopName: 'Lock&Lock Store',
    productName: 'Bình Giữ Nhiệt Lock&Lock 500ml',
    productImg: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=100&auto=format&fit=crop&q=60',
    orderValue: 320000,
    cashbackEstimate: 35000,
    cashbackActual: 0,
    status: 'Pending',
    date: '2026-07-08 19:40'
  },
  {
    id: 'o4',
    orderId: 'SP-774910243',
    platform: 'Shopee',
    shopName: 'Shop Quần Áo Teen',
    productName: 'Áo Thun Cotton Unisex Oversize',
    productImg: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=100&auto=format&fit=crop&q=60',
    orderValue: 150000,
    cashbackEstimate: 12000,
    cashbackActual: 0,
    status: 'Rejected',
    date: '2026-07-01 11:22',
    reason: 'Hủy đơn hàng sau khi đối soát trên sàn.'
  },
  {
    id: 'o5',
    orderId: 'TT-112239401',
    platform: 'TikTok Shop',
    shopName: 'Anker Mall',
    productName: 'Củ Sạc Nhanh Anker 20W USB-C',
    productImg: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=100&auto=format&fit=crop&q=60',
    orderValue: 250000,
    cashbackEstimate: 18000,
    cashbackActual: 18000,
    status: 'Paid',
    date: '2026-06-18 10:05'
  }
];

// 3. Balance & Wallet History
export const mockWallet = {
  available: 425000,
  pending: 185000,
  withdrawn: 1200000,
  totalReceived: 1625000
};

export const mockLedgerEntries: LedgerEntry[] = [
  {
    id: 'le1',
    type: 'cashback_received',
    amount: 15000,
    date: '2026-07-08 12:00',
    description: 'Tiền hoàn từ đơn hàng SP-992384210 được đối soát thành công',
    balanceAfter: 425000
  },
  {
    id: 'le2',
    type: 'referral_bonus',
    amount: 50000,
    date: '2026-07-05 15:30',
    description: 'Thưởng giới thiệu thành viên mới nguyen_van_a@gmail.com',
    balanceAfter: 410000
  },
  {
    id: 'le3',
    type: 'withdrawal',
    amount: -500000,
    date: '2026-06-30 08:00',
    description: 'Rút tiền về tài khoản Techcombank số ****4321',
    balanceAfter: 360000
  },
  {
    id: 'le4',
    type: 'cashback_received',
    amount: 18000,
    date: '2026-06-28 14:10',
    description: 'Tiền hoàn từ đơn hàng TT-112239401 được đối soát thành công',
    balanceAfter: 860000
  }
];

// 4. Withdrawal Requests
export const mockWithdrawalRequests: WithdrawalRequest[] = [
  {
    id: 'w1',
    amount: 500000,
    bankName: 'Techcombank',
    accountNumber: '19034298104321',
    accountName: 'NGUYEN VAN KHANH',
    status: 'Approved',
    date: '2026-06-30 08:00',
    transactionCode: 'FT261819034281'
  },
  {
    id: 'w2',
    amount: 200000,
    bankName: 'Techcombank',
    accountNumber: '19034298104321',
    accountName: 'NGUYEN VAN KHANH',
    status: 'Pending',
    date: '2026-07-09 23:45'
  }
];

// 5. Referral Data
export const mockReferralStats = {
  referralCode: 'HOANTIENVIP123',
  referralLink: 'https://hoantienvip.vn/ref/HOANTIENVIP123',
  totalInvited: 12,
  earned: 450000,
  history: [
    { name: 'Nguyễn Văn Hùng', date: '2026-07-08', status: 'Đang hoạt động', bonus: '50.000đ' },
    { name: 'Trần Thị Mai', date: '2026-07-05', status: 'Đã nhận thưởng', bonus: '50.000đ' },
    { name: 'Lê Hoàng Nam', date: '2026-07-01', status: 'Chưa đủ điều kiện', bonus: '0đ' }
  ]
};

// 6. Points (Xu) & Tasks
export const mockPoints = {
  total: 3450,
  history: [
    { type: 'Điểm danh hằng ngày', amount: 50, date: '2026-07-10' },
    { type: 'Tạo link hoàn tiền', amount: 100, date: '2026-07-09' },
    { type: 'Chia sẻ deal hot', amount: 100, date: '2026-07-09' },
    { type: 'Đăng ký tài khoản mới', amount: 3000, date: '2026-07-01' }
  ]
};

export const mockTasks: RewardTask[] = [
  { id: 't1', title: 'Điểm danh nhận xu hằng ngày', reward: 50, completed: true, type: 'daily' },
  { id: 't2', title: 'Tạo ít nhất 1 link hoàn tiền', reward: 100, completed: false, type: 'daily' },
  { id: 't3', title: 'Chia sẻ deal hot cho bạn bè', reward: 100, completed: true, type: 'daily' },
  { id: 't4', title: 'Hoàn tất cập nhật thông tin ngân hàng', reward: 500, completed: true, type: 'once' },
  { id: 't5', title: 'Rút tiền hoàn lần đầu tiên', reward: 1000, completed: false, type: 'once' }
];

export const mockGifts: RewardGift[] = [
  { id: 'g1', title: 'Voucher giảm giá 10K Shopee', cost: 1000, imageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300', stock: 99 },
  { id: 'g2', title: 'Voucher giảm giá 50K Hoàn Tiền', cost: 4000, imageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300', stock: 12 },
  { id: 'g3', title: 'Bình Giữ Nhiệt Lõi Inox 316 Cao Cấp', cost: 15000, imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300', stock: 5 },
  { id: 'g4', title: 'Túi vải Canvas Vintage bảo vệ môi trường', cost: 6000, imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300', stock: 24 }
];

// 7. Shipment (Vận đơn)
export const mockShipments: Shipment[] = [
  {
    id: 's1',
    trackingNumber: 'SPXVN0192837461',
    carrier: 'SPX',
    latestStatus: 'Đang giao hàng',
    lastSynced: '2026-07-10 18:30',
    estimateDelivery: '2026-07-11',
    events: [
      { date: '2026-07-10', time: '18:30', location: 'Bưu cục Hà Đông, Hà Nội', description: 'Đang giao hàng. Nhân viên giao hàng Nguyễn Văn B (SĐT: 0987654321) đang vận chuyển.', status: 'OUT_FOR_DELIVERY' },
      { date: '2026-07-10', time: '02:15', location: 'Kho phân loại Hà Nội SOC', description: 'Đã xuất kho phân loại và chuyển đến bưu cục giao nhận.', status: 'IN_TRANSIT' },
      { date: '2026-07-09', time: '14:40', location: 'Kho phân loại Củ Chi, TP.HCM', description: 'Đã rời bưu cục nguồn gửi.', status: 'IN_TRANSIT' },
      { date: '2026-07-09', time: '10:00', location: 'Bến Tre', description: 'Đã nhận hàng tại bưu cục gốc.', status: 'PICKED_UP' }
    ]
  },
  {
    id: 's2',
    trackingNumber: 'LEXVN04839210432',
    carrier: 'LEX',
    latestStatus: 'Đã giao thành công',
    lastSynced: '2026-07-08 11:20',
    estimateDelivery: '2026-07-08',
    events: [
      { date: '2026-07-08', time: '11:15', location: 'Quận 1, TP.HCM', description: 'Giao hàng thành công. Người nhận ký nhận: KHANH.', status: 'DELIVERED' },
      { date: '2026-07-08', time: '08:00', location: 'Bưu cục Quận 1, TP.HCM', description: 'Đang giao hàng. Shipper đang đi phát.', status: 'OUT_FOR_DELIVERY' },
      { date: '2026-07-07', time: '21:00', location: 'Trung tâm phân loại LEX Hoài Đức', description: 'Hàng đã nhập trung tâm phân loại.', status: 'AT_SORTING_HUB' },
      { date: '2026-07-06', time: '12:30', location: 'Nhà bán hàng', description: 'LEX đã nhận hàng từ nhà bán.', status: 'PICKED_UP' }
    ]
  }
];

export const mockCarriersList = [
  'SPX', 'LEX', 'EMS', 'J&T', 'GHN', '247Express', 'VNPost', 'Viettel Post',
  'GHTK', 'Best', 'Futa', 'Nhất Tín', 'Netco', 'NetPost'
];

// 8. Admin Indicators & Statistics
export const mockAdminStats = {
  totalGMV: 15420000000,
  sourceCommission: 1230000000,
  userCashbackPending: 185000000,
  userCashbackPaid: 1045000000,
  withdrawalRequestsPendingCount: 34,
  syncErrorsCount: 2,
  carrierHealth: [
    { carrier: 'SPX', status: 'Healthy', latency: '120ms', successRate: '99.8%' },
    { carrier: 'LEX', status: 'Healthy', latency: '145ms', successRate: '99.5%' },
    { carrier: 'GHTK', status: 'Healthy', latency: '210ms', successRate: '98.9%' },
    { carrier: 'GHN', status: 'Degraded', latency: '1200ms', successRate: '94.2%' },
    { carrier: 'VNPost', status: 'Maintenance', latency: '0ms', successRate: '0.0%' },
    { carrier: 'Viettel Post', status: 'Healthy', latency: '180ms', successRate: '99.1%' }
  ],
  recentSyncErrors: [
    { id: 'err1', time: '2026-07-10 18:42', type: 'RioHub Webhook Signature Fail', detail: 'Chữ ký webhook RioHub gửi sang không khớp. Event ID: evt_99843210' },
    { id: 'err2', time: '2026-07-10 15:10', type: 'Shopee API Rate Limit Exceeded', detail: 'Lỗi 429 quá giới hạn request khi gọi đồng bộ offer' }
  ]
};

// 9. Active Users & Audit logs for Admin
export const mockAdminUsersList = [
  { id: 'u1', name: 'Nguyễn Văn Khánh', phone: '0912345678', email: 'khanh@gmail.com', cashbackTotal: 1625000, status: 'Active', registered: '2026-06-01' },
  { id: 'u2', name: 'Trần Thị Thuỷ', phone: '0987654321', email: 'thuy.tran@gmail.com', cashbackTotal: 840000, status: 'Active', registered: '2026-06-10' },
  { id: 'u3', name: 'Lê Hoàng Long', phone: '0909090909', email: 'longlh@gmail.com', cashbackTotal: 0, status: 'Suspended', registered: '2026-07-02' }
];

export const mockAdminAuditLogs = [
  { id: 'al1', time: '2026-07-10 18:45', adminName: 'Admin Super', action: 'DUYỆT_RÚT_TIỀN', target: 'Yêu cầu rút tiền w1 (500K)', ip: '127.0.0.1' },
  { id: 'al2', time: '2026-07-09 10:15', adminName: 'Admin CS', action: 'KHÓA_USER', target: 'User Lê Hoàng Long (Vi phạm gian lận giới thiệu)', ip: '127.0.0.1' },
  { id: 'al3', time: '2026-07-08 14:30', adminName: 'Admin Super', action: 'CẤU_HÌNH_CARRIER', target: 'Tạm dừng cổng kết nối VNPost để bảo trì', ip: '127.0.0.1' }
];

export const mockUserProfile: UserProfile = {
  name: 'NGUYEN VAN KHANH',
  phone: '0912345678',
  email: 'khanh@gmail.com',
  bankName: 'Techcombank',
  bankAccount: '19034298104321',
  bankAccountName: 'NGUYEN VAN KHANH',
  referralCode: 'HOANTIENVIP123',
  registrationDate: '2026-06-01'
};

// 10. Support Tickets Mocks
export const mockSupportTickets: SupportTicket[] = [
  {
    id: 'TK123',
    subject: 'Hoàn tiền chưa cập nhật cho đơn hàng #SPX123',
    status: 'Open',
    priority: 'High',
    category: 'Hoàn tiền chưa cập nhật',
    linkedOrder: '#SPX123',
    createdAt: '2026-05-24 10:30',
    updatedAt: '2026-05-24 10:40',
    messages: [
      { id: 'm1', sender: 'system', senderName: 'Hệ thống', text: 'Ticket đã được tạo vào 10:30, 24/05/2026', time: '10:30' },
      { id: 'm2', sender: 'user', senderName: 'Khanh Nguyen', text: 'Chào bạn, mình vừa thực hiện giao dịch tại Shopee qua link HOANTIENVIP nhưng chưa thấy cập nhật tiền hoàn lại. Mã đơn hàng là #SPX123.', time: '10:32' },
      { id: 'm3', sender: 'agent', senderName: 'Minh Anh (Support)', text: 'Chào Anh/Chị, em là Minh từ bộ phận hỗ trợ HOANTIENVIP. Em đã nhận được thông tin về đơn hàng #SPX123. Để kiểm tra kỹ hơn, Anh/Chị vui lòng chụp lại màn hình lịch sử mua hàng giúp em nhé.', time: '10:35' },
      { id: 'm4', sender: 'user', senderName: 'Khanh Nguyen', text: 'Đây là ảnh chụp màn hình đơn hàng của mình ạ.', time: '10:40', imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600' }
    ]
  }
];

// 11. Cashback Rules Mocks
export const mockCashbackRules: CashbackRule[] = [
  { id: 'r1', category: 'Electronics', platform: 'Shopee', type: 'Mall', sourceCommission: 5.2, pitTax: 10, userCashback: 4.68, approvalDays: 45, effectiveDate: '2023-12-01', status: 'Active', notes: 'Áp dụng cho gian hàng chính hãng Shopee Mall' },
  { id: 'r2', category: 'Fashion & Beauty', platform: 'Shopee', type: 'Marketplace', sourceCommission: 12.5, pitTax: 10, userCashback: 11.25, approvalDays: 30, effectiveDate: '2024-01-15', status: 'Active', notes: 'Áp dụng cho các nhà bán thường trên sàn' },
  { id: 'r3', category: 'Home & Living', platform: 'Shopee', type: 'International', sourceCommission: 8.0, pitTax: 10, userCashback: 7.20, approvalDays: 60, effectiveDate: '2023-10-10', status: 'Expired', notes: 'Chương trình ưu đãi quốc tế cuối năm' },
  { id: 'r4', category: 'Groceries', platform: 'Shopee', type: 'Supermarket', sourceCommission: 3.5, pitTax: 10, userCashback: 3.15, approvalDays: 21, effectiveDate: '2024-02-01', status: 'Active', notes: 'Áp dụng cho Shopee Supermarket' },
  { id: 'r5', category: 'Electronics & Gadgets', platform: 'TikTok Shop', type: 'Mall', sourceCommission: 6.0, pitTax: 10, userCashback: 5.40, approvalDays: 30, effectiveDate: '2024-03-01', status: 'Active', notes: 'TikTok Shop Mall Electronics' },
  { id: 'r6', category: 'Fashion & Apparel', platform: 'TikTok Shop', type: 'Marketplace', sourceCommission: 15.0, pitTax: 10, userCashback: 13.5, approvalDays: 14, effectiveDate: '2024-02-10', status: 'Active', notes: 'Ngành thời trang hot trend' }
];

// 12. Admin Promotions & Giftcodes Mocks
export const mockAdminPromoCodes: AdminPromoCode[] = [
  { id: 'pc1', code: 'WELCOME2024', description: 'New user 10% cashback', type: 'cashback', value: 10, usedCount: 842, limitCount: 1000, startDate: '2026-01-01', endDate: '2026-12-31', status: 'Active' },
  { id: 'pc2', code: 'TETHOANVUI', description: 'Holiday Special Bonus', type: 'flat', value: 20000, usedCount: 500, limitCount: 500, startDate: '2026-02-01', endDate: '2026-02-28', status: 'Expired' },
  { id: 'pc3', code: 'LAUNCH50K', description: 'Flat 50k Xu for top merchants', type: 'points', value: 50000, usedCount: 12, limitCount: 50, startDate: '2026-04-15', endDate: '2026-05-15', status: 'Scheduled' }
];

export const mockAdminReferralCampaigns: AdminReferralCampaign[] = [
  { id: 'rc1', name: 'Đồng hành giới thiệu bạn mới', rewardPerUser: 50000, totalJoined: 1420, status: 'Active', startDate: '2026-06-01', endDate: '2026-08-31' },
  { id: 'rc2', name: 'Đại sứ hoàn tiền Xuân 2026', rewardPerUser: 100000, totalJoined: 850, status: 'Completed', startDate: '2026-01-01', endDate: '2026-02-15' }
];

// 13. Admin Staff Members Mocks
export const mockAdminStaffMembers: AdminStaffMember[] = [
  { id: 'st1', name: 'Khanh Nguyen', role: 'Admin', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', status: 'Active', lastActive: '2m ago', twoFaEnabled: true },
  { id: 'st2', name: 'Minh Anh', role: 'CSKH', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', status: 'Active', lastActive: 'now', twoFaEnabled: true },
  { id: 'st3', name: 'Quoc Bao', role: 'Operation', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', status: 'Offline', lastActive: '2h ago', twoFaEnabled: false },
  { id: 'st4', name: 'Thu Trang', role: 'Finance', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', status: 'Active', lastActive: '1h ago', twoFaEnabled: true }
];

export const mockAdminSecurityLogs: AdminSecurityLog[] = [
  { id: 'asl1', actorName: 'Khanh Nguyen', actorRole: 'Admin', action: 'UPDATE_ROLE', target: 'Staff: Minh Anh', ip: '192.168.1.1', timestamp: '2026-07-10 18:45' },
  { id: 'asl2', actorName: 'System Core', actorRole: 'System', action: 'BACKUP_DB', target: 'Postgres Production DB', ip: '10.0.0.4', timestamp: '2026-07-10 00:00' },
  { id: 'asl3', actorName: 'Thu Trang', actorRole: 'Finance', action: 'APPROVE_PAYOUT', target: 'Withdrawal Request #w1', ip: '192.168.1.42', timestamp: '2026-07-09 10:15' }
];

// 14. Admin Banners and Push Notifications Mocks
export const mockAdminPromoBanners: AdminPromoBanner[] = [
  { id: 'b1', title: 'Tet Savings 2026 - 15% Cashback', imageUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800', link: 'hoantienvip.com/deals/tet2026', startDate: '2026-02-01', endDate: '2026-02-28', status: 'Active' },
  { id: 'b2', title: 'Tech Week Extravaganza', imageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800', link: 'hoantienvip.com/promo/tech', startDate: '2026-07-01', endDate: '2026-07-31', status: 'Active' }
];

export const mockAdminPushNotifications: AdminPushNotification[] = [
  { id: 'pn1', title: 'Tet Bonus 50k Sent!', body: 'Chúc mừng bạn! Nhận ngay 50.000đ hoàn tiền khi mua sắm tại...', target: '45,200 users', sentCount: 45200, status: 'Delivered', sentDate: 'Feb 10, 2026' },
  { id: 'pn2', title: 'Weekly Cashback Summary', body: 'Check out your savings for this week. You earned 245.000đ total...', target: 'All Registered', sentCount: 0, status: 'Scheduled', scheduleTime: 'Monday 09:00' }
];

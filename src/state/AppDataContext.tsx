/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  mockCashbackOrders,
  mockGifts,
  mockLedgerEntries,
  mockPoints,
  mockProducts,
  mockShipments,
  mockSupportTickets,
  mockTasks,
  mockUserProfile,
  mockWallet,
  mockWithdrawalRequests,
} from '../mockData';
import type {
  CashbackOrder,
  LedgerEntry,
  Product,
  RewardGift,
  RewardTask,
  Shipment,
  SupportMessage,
  SupportTicket,
  UserProfile,
  WithdrawalRequest,
} from '../mockData';
import { appendLedgerEntry } from '../domain/ledger';
import type { LedgerEntry as DomainLedgerEntry } from '../domain/ledger';

export interface WalletSummary {
  available: number;
  pending: number;
  withdrawn: number;
  totalReceived: number;
}

interface PersistedState {
  products: Product[];
  wallet: WalletSummary;
  withdrawals: WithdrawalRequest[];
  points: number;
  tasks: RewardTask[];
  gifts: RewardGift[];
  shipments: Shipment[];
  supportTickets: SupportTicket[];
  cashbackOrders: CashbackOrder[];
  ledgerEntries: LedgerEntry[];
  profile: UserProfile;
  domainLedger: DomainLedgerEntry[];
  redeemedGiftCodes: string[];
}

interface AppDataContextValue extends PersistedState {
  toggleSavedProduct: (productId: string) => void;
  requestWithdrawal: (amountVnd: number) => WithdrawalRequest;
  completeRewardTask: (taskId: string) => void;
  redeemRewardGift: (giftId: string) => void;
  addShipment: (shipment: Shipment) => void;
  sendTicketMessage: (ticketId: string, text: string) => void;
  closeSupportTicket: (ticketId: string) => void;
  updateProfile: (profile: UserProfile) => void;
  redeemGiftCode: (code: string) => number;
  resetDemoData: () => void;
}

const STORAGE_KEY = 'hoantienvip.app-data.v1';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const now = () => new Date().toISOString().replace('T', ' ').slice(0, 16);
const createId = (prefix: string) => `${prefix}_${globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10)}`;

const createInitialState = (): PersistedState => ({
  products: clone(mockProducts),
  wallet: clone(mockWallet),
  withdrawals: clone(mockWithdrawalRequests),
  points: mockPoints.total,
  tasks: clone(mockTasks),
  gifts: clone(mockGifts),
  shipments: clone(mockShipments),
  supportTickets: clone(mockSupportTickets),
  cashbackOrders: clone(mockCashbackOrders),
  ledgerEntries: clone(mockLedgerEntries),
  profile: clone(mockUserProfile),
  domainLedger: mockLedgerEntries.map((entry) => ({
    id: entry.id,
    idempotencyKey: `seed-${entry.id}`,
    type: entry.amount < 0 ? 'withdrawal_paid' : entry.type === 'referral_bonus' ? 'referral_bonus' : 'cashback_settled',
    amountVnd: entry.amount,
    occurredAt: entry.date,
    description: entry.description,
    referenceId: entry.id,
    policyVersion: 'seed-v1',
    balanceAfterVnd: entry.balanceAfter,
  })),
  redeemedGiftCodes: [],
});

const readInitialState = (): PersistedState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed.wallet || !Array.isArray(parsed.products) || !Array.isArray(parsed.withdrawals)) return createInitialState();
    const fallback = createInitialState();
    return {
      ...fallback,
      ...parsed,
      domainLedger: parsed.domainLedger ?? fallback.domainLedger,
      redeemedGiftCodes: parsed.redeemedGiftCodes ?? [],
    };
  } catch {
    return createInitialState();
  }
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PersistedState>(readInitialState);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const toggleSavedProduct = useCallback((productId: string) => {
    setState((previous) => ({
      ...previous,
      products: previous.products.map((product) => product.id === productId ? { ...product, saved: !product.saved } : product),
    }));
  }, []);

  const requestWithdrawal = useCallback((amountVnd: number) => {
    if (!Number.isSafeInteger(amountVnd) || amountVnd < 50_000) throw new Error('Số tiền rút tối thiểu là 50.000đ.');
    if (amountVnd > state.wallet.available) throw new Error('Số dư khả dụng không đủ để thực hiện yêu cầu.');
    const request: WithdrawalRequest = {
      id: createId('wd'),
      amount: amountVnd,
      bankName: state.profile.bankName,
      accountNumber: state.profile.bankAccount,
      accountName: state.profile.bankAccountName,
      status: 'Pending',
      date: now(),
    };
    setState((previous) => {
      const nextDomainLedger = appendLedgerEntry(previous.domainLedger, {
        id: createId('le'),
        idempotencyKey: `withdrawal-request-${request.id}`,
        type: 'withdrawal_requested',
        amountVnd: -amountVnd,
        occurredAt: request.date,
        description: `Giữ tiền cho yêu cầu rút ${request.id}`,
        referenceId: request.id,
      });
      const balanceAfter = previous.wallet.available - amountVnd;
      return {
        ...previous,
        wallet: { ...previous.wallet, available: balanceAfter },
        withdrawals: [request, ...previous.withdrawals],
        ledgerEntries: [{
          id: createId('ledger'), type: 'withdrawal', amount: -amountVnd, date: request.date,
          description: `Yêu cầu rút tiền ${request.id} đang chờ xử lý`, balanceAfter,
        }, ...previous.ledgerEntries],
        domainLedger: nextDomainLedger,
      };
    });
    return request;
  }, [state.profile, state.wallet.available]);

  const completeRewardTask = useCallback((taskId: string) => {
    setState((previous) => {
      const task = previous.tasks.find((item) => item.id === taskId);
      if (!task) throw new Error('Không tìm thấy nhiệm vụ.');
      if (task.completed) return previous;
      return {
        ...previous,
        points: previous.points + task.reward,
        tasks: previous.tasks.map((item) => item.id === taskId ? { ...item, completed: true } : item),
      };
    });
  }, []);

  const redeemRewardGift = useCallback((giftId: string) => {
    setState((previous) => {
      const gift = previous.gifts.find((item) => item.id === giftId);
      if (!gift) throw new Error('Không tìm thấy phần quà.');
      if (gift.stock < 1) throw new Error('Phần quà này đã hết.');
      if (previous.points < gift.cost) throw new Error('Số Xu thưởng không đủ để đổi phần quà này.');
      return {
        ...previous,
        points: previous.points - gift.cost,
        gifts: previous.gifts.map((item) => item.id === giftId ? { ...item, stock: item.stock - 1 } : item),
      };
    });
  }, []);

  const addShipment = useCallback((shipment: Shipment) => {
    setState((previous) => {
      if (previous.shipments.some((item) => item.trackingNumber === shipment.trackingNumber && item.carrier === shipment.carrier)) {
        throw new Error('Vận đơn này đã có trong danh sách theo dõi.');
      }
      return { ...previous, shipments: [shipment, ...previous.shipments] };
    });
  }, []);

  const sendTicketMessage = useCallback((ticketId: string, text: string) => {
    const body = text.trim();
    if (!body) throw new Error('Nội dung phản hồi không được để trống.');
    const message: SupportMessage = { id: createId('msg'), sender: 'user', senderName: 'Bạn', text: body, time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) };
    setState((previous) => ({
      ...previous,
      supportTickets: previous.supportTickets.map((ticket) => ticket.id === ticketId ? { ...ticket, status: 'Open', updatedAt: now(), messages: [...ticket.messages, message] } : ticket),
    }));
  }, []);

  const closeSupportTicket = useCallback((ticketId: string) => {
    setState((previous) => ({
      ...previous,
      supportTickets: previous.supportTickets.map((ticket) => ticket.id === ticketId ? { ...ticket, status: 'Closed', updatedAt: now() } : ticket),
    }));
  }, []);

  const updateProfile = useCallback((profile: UserProfile) => setState((previous) => ({ ...previous, profile })), []);
  const redeemGiftCode = useCallback((rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    const rewards: Record<string, number> = { HOANTIENVIP100: 100_000, HV100: 100_000 };
    const rewardVnd = rewards[code];
    if (!rewardVnd) throw new Error('Mã Giftcode không tồn tại hoặc đã hết hạn sử dụng.');
    if (state.redeemedGiftCodes.includes(code)) throw new Error('Bạn đã sử dụng Giftcode này rồi.');
    const occurredAt = now();
    setState((previous) => {
      const domainLedger = appendLedgerEntry(previous.domainLedger, {
        id: createId('le'), idempotencyKey: `giftcode-${code}`, type: 'cashback_settled', amountVnd: rewardVnd,
        occurredAt, description: `Kích hoạt Giftcode ${code}`, referenceId: code, policyVersion: 'giftcode-v1',
      });
      const balanceAfter = previous.wallet.available + rewardVnd;
      return {
        ...previous,
        wallet: { ...previous.wallet, available: balanceAfter, totalReceived: previous.wallet.totalReceived + rewardVnd },
        redeemedGiftCodes: [...previous.redeemedGiftCodes, code],
        ledgerEntries: [{ id: createId('ledger'), type: 'cashback_received', amount: rewardVnd, date: occurredAt, description: `Giftcode ${code}`, balanceAfter }, ...previous.ledgerEntries],
        domainLedger,
      };
    });
    return rewardVnd;
  }, [state.redeemedGiftCodes]);
  const resetDemoData = useCallback(() => setState(createInitialState()), []);

  const value = useMemo<AppDataContextValue>(() => ({
    ...state, toggleSavedProduct, requestWithdrawal, completeRewardTask, redeemRewardGift,
    addShipment, sendTicketMessage, closeSupportTicket, updateProfile, redeemGiftCode, resetDemoData,
  }), [state, toggleSavedProduct, requestWithdrawal, completeRewardTask, redeemRewardGift, addShipment, sendTicketMessage, closeSupportTicket, updateProfile, redeemGiftCode, resetDemoData]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData phải được dùng bên trong AppDataProvider.');
  return context;
};

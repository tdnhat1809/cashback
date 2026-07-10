import type { Dispatch, SetStateAction } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastState {
  show: boolean;
  message: string;
  type: ToastType;
}

export const defaultToastState: ToastState = { show: false, message: '', type: 'info' };

export const triggerToast = (
  setToast: Dispatch<SetStateAction<ToastState>>,
  message: string,
  type: ToastType,
) => setToast({ show: true, message, type });

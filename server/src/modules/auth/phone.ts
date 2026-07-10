const VIETNAM_MOBILE_PATTERN = /^\+84[35789]\d{8}$/;

export class InvalidVietnamesePhoneError extends Error {
  constructor() {
    super('Số điện thoại Việt Nam không hợp lệ.');
    this.name = 'InvalidVietnamesePhoneError';
  }
}

/**
 * Converts common Vietnamese mobile formats to E.164 (+84xxxxxxxxx).
 * Fixed-line and legacy 11-digit numbers are intentionally rejected because
 * this number is used as an OTP identity.
 */
export const normalizeVietnamesePhone = (input: string): string => {
  const compact = input.trim().replace(/[\s.()-]/g, '');
  let normalized: string;

  if (/^0\d{9}$/.test(compact)) {
    normalized = `+84${compact.slice(1)}`;
  } else if (/^84\d{9}$/.test(compact)) {
    normalized = `+${compact}`;
  } else if (/^\+84\d{9}$/.test(compact)) {
    normalized = compact;
  } else {
    throw new InvalidVietnamesePhoneError();
  }

  if (!VIETNAM_MOBILE_PATTERN.test(normalized)) {
    throw new InvalidVietnamesePhoneError();
  }

  return normalized;
};

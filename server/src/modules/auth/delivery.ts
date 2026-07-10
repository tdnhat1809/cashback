import type { AppConfig } from '../../config.js';
import type { OtpPurpose } from './service.js';

export interface OtpDeliveryRequest {
  phone: string;
  code: string;
  purpose: OtpPurpose;
  expiresAt: string;
}

export interface OtpDelivery {
  send(input: OtpDeliveryRequest): Promise<void>;
}

export class OtpDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OtpDeliveryError';
  }
}

class WebhookOtpDelivery implements OtpDelivery {
  constructor(private readonly endpoint: string, private readonly token: string) {}

  async send(input: OtpDeliveryRequest): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new OtpDeliveryError(`OTP delivery webhook responded with HTTP ${response.status}.`);
    } catch (error) {
      if (error instanceof OtpDeliveryError) throw error;
      throw new OtpDeliveryError('OTP delivery webhook is unavailable.');
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const createOtpDelivery = (config: AppConfig): OtpDelivery | undefined => {
  if (!config.OTP_DELIVERY_WEBHOOK_URL) return undefined;
  return new WebhookOtpDelivery(config.OTP_DELIVERY_WEBHOOK_URL, config.OTP_DELIVERY_WEBHOOK_TOKEN);
};

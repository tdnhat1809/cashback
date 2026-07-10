import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { getSessionToken, type AuthService } from '../auth/index.js';
import {
  UserFeatureError,
  type AddSupportMessageInput,
  type CreateSupportTicketInput,
  type NotificationPreferencePatch,
  type ProfilePatch,
  type UserFeaturesService,
} from './service.js';

export interface UserFeaturesHttpOptions {
  service: UserFeaturesService;
  auth: AuthService;
  cookieName: string;
}

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const productSchema = z.object({ productId: z.string().trim().min(1).max(120) });
const notificationListSchema = paginationSchema.extend({
  unreadOnly: z.enum(['true', 'false', '1', '0']).optional(),
});
const preferencesSchema = z.object({
  inApp: z.boolean().optional(),
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  shipmentUpdates: z.boolean().optional(),
  cashbackUpdates: z.boolean().optional(),
  promotions: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'Cần có ít nhất một thiết lập.' });
const giftcodeSchema = z.object({ code: z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/) });
const supportTicketSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  category: z.string().trim().min(2).max(60).regex(/^[\p{L}\p{N}_ -]+$/u),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  linkedOrderId: z.string().trim().min(1).max(120).optional(),
  message: z.string().trim().min(2).max(5000),
  attachmentUrl: z.string().url().max(2000).optional(),
});
const supportMessageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  attachmentUrl: z.string().url().max(2000).optional(),
});
const supportListSchema = paginationSchema.extend({ status: z.enum(['open', 'resolved', 'closed']).optional() });
const profileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.union([z.string().trim().email().max(254).transform((value) => value.toLowerCase()), z.null()]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'Cần có ít nhất một thay đổi.' });

const parse = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new UserFeatureError('validation_error', 'Dữ liệu không hợp lệ.', 422, {
      fields: z.flattenError(result.error).fieldErrors,
      form: z.flattenError(result.error).formErrors,
    });
  }
  return result.data;
};

const handler = (run: (request: Request, response: Response) => void): RequestHandler =>
  (request, response, next): void => {
    try {
      run(request, response);
    } catch (error) {
      next(error);
    }
  };

export const userFeatureErrorHandler = (
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction,
): void => {
  if (!(error instanceof UserFeatureError)) {
    next(error);
    return;
  }
  response.status(error.status).json({
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
};

/**
 * Routes are relative to the API root. Mount this router at `/api/v1`.
 * Authentication always comes from AuthService's opaque HttpOnly session cookie.
 */
export const createUserFeaturesRouter = (options: UserFeaturesHttpOptions): Router => {
  const router = Router();
  const userId = (request: Request) =>
    options.auth.getCurrentUser(getSessionToken(request, options.cookieName)).id;

  router.get('/saved-products', handler((request, response) => {
    response.json({ data: options.service.listSavedProducts(userId(request), parse(paginationSchema, request.query)) });
  }));
  router.post('/saved-products', handler((request, response) => {
    const result = options.service.saveProduct(userId(request), parse(productSchema, request.body).productId);
    response.status(result.created ? 201 : 200).json({ data: result });
  }));
  router.post('/saved-products/:productId/toggle', handler((request, response) => {
    const productId = parse(productSchema, { productId: String(request.params.productId) }).productId;
    response.json({ data: options.service.toggleSavedProduct(userId(request), productId) });
  }));
  router.delete('/saved-products/:productId', handler((request, response) => {
    const productId = parse(productSchema, { productId: String(request.params.productId) }).productId;
    options.service.removeSavedProduct(userId(request), productId);
    response.status(204).end();
  }));

  router.get('/notifications/preferences', handler((request, response) => {
    response.json({ data: options.service.getNotificationPreferences(userId(request)) });
  }));
  router.patch('/notifications/preferences', handler((request, response) => {
    const patch = parse(preferencesSchema, request.body) as NotificationPreferencePatch;
    response.json({ data: options.service.updateNotificationPreferences(userId(request), patch) });
  }));
  router.patch('/notifications/read-all', handler((request, response) => {
    response.json({ data: options.service.markAllNotificationsRead(userId(request)) });
  }));
  router.post('/notifications/read-all', handler((request, response) => {
    response.json({ data: options.service.markAllNotificationsRead(userId(request)) });
  }));
  router.get('/notifications', handler((request, response) => {
    const query = parse(notificationListSchema, request.query);
    const unreadOnly = query.unreadOnly === 'true' || query.unreadOnly === '1';
    response.json({ data: options.service.listNotifications(userId(request), query, unreadOnly) });
  }));
  router.patch('/notifications/:notificationId/read', handler((request, response) => {
    response.json({ data: options.service.markNotificationRead(userId(request), String(request.params.notificationId)) });
  }));

  router.post('/giftcodes/redeem', handler((request, response) => {
    const input = parse(giftcodeSchema, request.body);
    const result = options.service.redeemGiftcode(userId(request), input.code);
    response.status(result.alreadyRedeemed ? 200 : 201).json({ data: result });
  }));
  router.get('/points', handler((request, response) => {
    response.json({ data: options.service.getPoints(userId(request), parse(paginationSchema, request.query)) });
  }));

  router.get('/referrals/summary', handler((request, response) => {
    response.json({ data: options.service.getReferralSummary(userId(request), parse(paginationSchema, request.query)) });
  }));
  router.get('/referrals', handler((request, response) => {
    response.json({ data: options.service.getReferralSummary(userId(request), parse(paginationSchema, request.query)) });
  }));

  router.post('/support/tickets', handler((request, response) => {
    const input = parse(supportTicketSchema, request.body) as CreateSupportTicketInput;
    response.status(201).json({ data: options.service.createSupportTicket(userId(request), input) });
  }));
  router.get('/support/tickets', handler((request, response) => {
    const query = parse(supportListSchema, request.query);
    response.json({ data: options.service.listSupportTickets(userId(request), query, query.status) });
  }));
  router.get('/support/tickets/:ticketId', handler((request, response) => {
    response.json({ data: options.service.getSupportTicket(userId(request), String(request.params.ticketId)) });
  }));
  router.post('/support/tickets/:ticketId/messages', handler((request, response) => {
    const input = parse(supportMessageSchema, request.body) as AddSupportMessageInput;
    response.status(201).json({
      data: options.service.addSupportMessage(userId(request), String(request.params.ticketId), input),
    });
  }));

  router.get('/profile', handler((request, response) => {
    response.json({ data: options.service.getProfile(userId(request)) });
  }));
  router.patch('/profile', handler((request, response) => {
    response.json({ data: options.service.updateProfile(userId(request), parse(profileSchema, request.body) as ProfilePatch) });
  }));
  router.get('/activity-logs', handler((request, response) => {
    response.json({ data: options.service.listActivityLogs(userId(request), parse(paginationSchema, request.query)) });
  }));

  router.use(userFeatureErrorHandler);
  return router;
};

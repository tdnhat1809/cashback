import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { z } from 'zod';
import type { SqliteDatabase } from '../../db/database.js';
import { AuthError, type AuthService, getSessionToken } from '../auth/index.js';
import { AccountingError } from './accounting.js';
import { FinanceAdminError, FinanceAdminService } from './FinanceAdminService.js';
import { PayoutBatchError, PayoutBatchService } from './PayoutBatchService.js';
import { SettlementError, SettlementService } from './SettlementService.js';

const pageSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
const syncListSchema = pageSchema.extend({
  provider: z.string().trim().min(1).max(50).optional(),
  status: z.enum(['running', 'completed', 'failed']).optional(),
});
const withdrawalListSchema = pageSchema.extend({
  status: z.enum(['pending', 'approved', 'rejected', 'paid']).optional(),
});
const rejectionSchema = z.object({ reason: z.string().trim().min(3).max(500) });
const paidSchema = z.object({ transactionCode: z.string().trim().min(4).max(100) });
const payoutBatchStatusSchema = z.enum(['draft', 'approved', 'mock_submitted', 'reconciled']);
const payoutBatchListSchema = pageSchema.extend({ status: payoutBatchStatusSchema.optional() });
const payoutBatchCreateSchema = z.object({
  withdrawalIds: z.array(z.string().trim().min(1).max(128)).min(1).max(100),
  memo: z.string().trim().max(500).optional(),
}).superRefine((value, context) => {
  if (new Set(value.withdrawalIds).size !== value.withdrawalIds.length) {
    context.addIssue({ code: 'custom', path: ['withdrawalIds'], message: 'Withdrawal requests must be unique.' });
  }
});

const asyncHandler = (run: (request: Request, response: Response) => Promise<void> | void): RequestHandler =>
  (request, response, next) => Promise.resolve(run(request, response)).catch(next);

export interface FinanceAdminRouterOptions {
  database: SqliteDatabase;
  auth: AuthService;
  cookieName: string;
  settlementService?: SettlementService;
  financeAdminService?: FinanceAdminService;
  payoutBatchService?: PayoutBatchService;
}

export const createFinanceAdminRouter = (options: FinanceAdminRouterOptions): Router => {
  const router = Router();
  const settlements = options.settlementService ?? new SettlementService(options.database);
  const finance = options.financeAdminService ?? new FinanceAdminService(options.database);
  const payoutBatches = options.payoutBatchService ?? new PayoutBatchService(options.database);

  const actor = (request: Request) => options.auth.getCurrentUser(getSessionToken(request, options.cookieName));
  const requireOperations = (request: Request) => {
    const user = actor(request);
    if (!['operation', 'finance', 'admin'].includes(user.role)) {
      throw new AuthError('FORBIDDEN', 'You do not have access to settlement operations.', 403);
    }
    return user;
  };
  const requireFinance = (request: Request) => {
    const user = actor(request);
    if (!['finance', 'admin'].includes(user.role)) {
      throw new AuthError('FORBIDDEN', 'You do not have access to finance operations.', 403);
    }
    return user;
  };
  const idempotencyKey = (request: Request) => request.get('idempotency-key') ?? '';

  router.post('/settlements/import', asyncHandler((request, response) => {
    requireOperations(request);
    response.status(201).json({ data: settlements.importReport(request.body) });
  }));
  router.get('/settlements', asyncHandler((request, response) => {
    requireOperations(request);
    const page = pageSchema.parse(request.query);
    response.json({ data: settlements.listReports(page.limit, page.offset), meta: page });
  }));
  router.get('/settlements/:id', asyncHandler((request, response) => {
    requireOperations(request);
    response.json({ data: settlements.getReport(String(request.params.id)) });
  }));
  router.get('/sync-runs', asyncHandler((request, response) => {
    requireOperations(request);
    const query = syncListSchema.parse(request.query);
    response.json({ data: finance.listSyncRuns(query), meta: { limit: query.limit, offset: query.offset } });
  }));
  router.get('/sync-runs/:id', asyncHandler((request, response) => {
    requireOperations(request);
    response.json({ data: finance.getSyncRun(String(request.params.id)) });
  }));

  router.get('/withdrawals', asyncHandler((request, response) => {
    requireFinance(request);
    const query = withdrawalListSchema.parse(request.query);
    response.json({ data: finance.listWithdrawals(query), meta: { limit: query.limit, offset: query.offset } });
  }));
  router.get('/withdrawals/:id', asyncHandler((request, response) => {
    requireFinance(request);
    response.json({ data: finance.getWithdrawal(String(request.params.id)) });
  }));
  router.post('/withdrawals/:id/approve', asyncHandler((request, response) => {
    const user = requireFinance(request);
    response.json({
      data: finance.approveWithdrawal(String(request.params.id), user, idempotencyKey(request)),
    });
  }));
  router.post('/withdrawals/:id/reject', asyncHandler((request, response) => {
    const user = requireFinance(request);
    const input = rejectionSchema.parse(request.body);
    response.json({
      data: finance.rejectWithdrawal(
        String(request.params.id), user, idempotencyKey(request), input.reason,
      ),
    });
  }));
  router.post('/withdrawals/:id/mark-paid', asyncHandler((request, response) => {
    const user = requireFinance(request);
    const input = paidSchema.parse(request.body);
    response.json({
      data: finance.markWithdrawalPaid(
        String(request.params.id), user, idempotencyKey(request), input.transactionCode,
      ),
    });
  }));

  // Offline-only workflow. The explicit mock routes cannot contact a bank or
  // transition withdrawal_requests to paid.
  router.get('/payout-batches', asyncHandler((request, response) => {
    requireFinance(request);
    const query = payoutBatchListSchema.parse(request.query);
    response.json({ data: payoutBatches.listBatches(query), meta: { limit: query.limit, offset: query.offset } });
  }));
  router.post('/payout-batches', asyncHandler((request, response) => {
    const user = requireFinance(request);
    const input = payoutBatchCreateSchema.parse(request.body);
    response.status(201).json({
      data: payoutBatches.createBatch({
        actor: user, idempotencyKey: idempotencyKey(request), withdrawalIds: input.withdrawalIds, memo: input.memo,
      }),
    });
  }));
  router.get('/payout-batches/:id', asyncHandler((request, response) => {
    requireFinance(request);
    response.json({ data: payoutBatches.getBatch(String(request.params.id)) });
  }));
  router.post('/payout-batches/:id/approve', asyncHandler((request, response) => {
    const user = requireFinance(request);
    response.json({ data: payoutBatches.approveBatch(String(request.params.id), user, idempotencyKey(request)) });
  }));
  router.post('/payout-batches/:id/submit-mock', asyncHandler((request, response) => {
    const user = requireFinance(request);
    response.json({ data: payoutBatches.submitMockBatch(String(request.params.id), user, idempotencyKey(request)) });
  }));
  router.post('/payout-batches/:id/reconcile-mock', asyncHandler((request, response) => {
    const user = requireFinance(request);
    response.json({ data: payoutBatches.reconcileMockBatch(String(request.params.id), user, idempotencyKey(request)) });
  }));

  router.use((error: unknown, _request: Request, response: Response, next: NextFunction): void => {
    if (error instanceof AuthError) {
      response.status(error.status).json({ error: { code: error.code, message: error.message } });
      return;
    }
    if (error instanceof z.ZodError) {
      response.status(422).json({
        error: { code: 'validation_error', message: 'The request payload is invalid.', details: z.flattenError(error).fieldErrors },
      });
      return;
    }
    if (error instanceof SettlementError || error instanceof FinanceAdminError || error instanceof PayoutBatchError || error instanceof AccountingError) {
      response.status(error.status).json({
        error: {
          code: error.code,
          message: error.message,
          ...('details' in error && error.details ? { details: error.details } : {}),
        },
      });
      return;
    }
    next(error);
  });
  return router;
};


import type { SqliteDatabase } from '../../db/database.js';
import { createId, nowIso } from '../../lib/ids.js';
import { sha256 } from '../../lib/security.js';

export type ShipmentStatus = 'CREATED' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED';

const MOCK_STATUS_FLOW: readonly ShipmentStatus[] = [
  'CREATED',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

const descriptions: Record<ShipmentStatus, string> = {
  CREATED: 'Đã thêm mã vận đơn vào danh sách theo dõi.',
  PICKED_UP: 'Đơn vị vận chuyển đã lấy hàng từ người gửi.',
  IN_TRANSIT: 'Kiện hàng đang được vận chuyển tới khu vực nhận.',
  OUT_FOR_DELIVERY: 'Kiện hàng đang được giao tới người nhận.',
  DELIVERED: 'Kiện hàng đã được giao thành công.',
};

interface ShipmentRow {
  id: string;
  user_id: string;
  order_id: string | null;
  tracking_number: string;
  carrier_code: string;
  latest_status: ShipmentStatus;
  last_synced_at: string | null;
  eta: string | null;
  created_at: string;
  updated_at: string;
}

export class ShipmentError extends Error {
  constructor(message: string, readonly code: string, readonly status = 400) {
    super(message);
  }
}

const normalizeTrackingNumber = (value: string) => value.trim().replaceAll(/\s+/g, '').toUpperCase();
const normalizeCarrierCode = (value: string) => value.trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, '_');

export class ShipmentService {
  constructor(private readonly database: SqliteDatabase) {}

  listCarriers() {
    return this.database.prepare(`
      SELECT code, name, mode, enabled, rate_limit_per_minute, updated_at
      FROM carrier_configs ORDER BY name ASC
    `).all();
  }

  list(userId: string) {
    return this.database.prepare(`
      SELECT s.*,
             (SELECT COUNT(*) FROM shipment_events e WHERE e.shipment_id = s.id) AS event_count
      FROM shipments s WHERE s.user_id = ? ORDER BY s.created_at DESC
    `).all(userId);
  }

  get(userId: string, shipmentId: string) {
    const shipment = this.database.prepare('SELECT * FROM shipments WHERE id = ? AND user_id = ?')
      .get(shipmentId, userId) as ShipmentRow | undefined;
    if (!shipment) throw new ShipmentError('Không tìm thấy vận đơn.', 'shipment_not_found', 404);
    const events = this.database.prepare(`
      SELECT id, status, location, description, occurred_at
      FROM shipment_events WHERE shipment_id = ? ORDER BY occurred_at DESC, id DESC
    `).all(shipmentId);
    return { ...shipment, events };
  }

  create(input: { userId: string; trackingNumber: string; carrierCode: string; orderId?: string }) {
    const trackingNumber = normalizeTrackingNumber(input.trackingNumber);
    const carrierCode = normalizeCarrierCode(input.carrierCode);
    if (!/^[A-Z0-9-]{6,64}$/.test(trackingNumber)) {
      throw new ShipmentError('Mã vận đơn không hợp lệ.', 'tracking_number_invalid', 422);
    }
    const carrier = this.database.prepare('SELECT code, enabled FROM carrier_configs WHERE code = ?').get(carrierCode) as
      | { code: string; enabled: number }
      | undefined;
    if (!carrier) throw new ShipmentError('Hãng vận chuyển chưa được hỗ trợ.', 'carrier_not_supported', 422);
    if (!carrier.enabled) throw new ShipmentError('Hãng vận chuyển đang tạm ngừng theo dõi.', 'carrier_disabled', 409);

    const timestamp = nowIso();
    const id = createId('shipment');
    try {
      this.database.transaction(() => {
        this.database.prepare(`
          INSERT INTO shipments(id, user_id, order_id, tracking_number, carrier_code, latest_status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'CREATED', ?, ?)
        `).run(id, input.userId, input.orderId ?? null, trackingNumber, carrierCode, timestamp, timestamp);
        this.insertEvent(id, 'CREATED', timestamp);
      })();
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE')) {
        throw new ShipmentError('Vận đơn đã được theo dõi.', 'shipment_exists', 409);
      }
      throw error;
    }
    return this.get(input.userId, id);
  }

  syncMock(userId: string, shipmentId: string) {
    const shipment = this.database.prepare('SELECT * FROM shipments WHERE id = ? AND user_id = ?')
      .get(shipmentId, userId) as ShipmentRow | undefined;
    if (!shipment) throw new ShipmentError('Không tìm thấy vận đơn.', 'shipment_not_found', 404);
    const carrier = this.database.prepare('SELECT mode, enabled FROM carrier_configs WHERE code = ?').get(shipment.carrier_code) as
      | { mode: 'disabled' | 'mock' | 'live'; enabled: number }
      | undefined;
    if (!carrier?.enabled || carrier.mode === 'disabled') {
      throw new ShipmentError('Hãng vận chuyển đang tạm ngừng theo dõi.', 'carrier_disabled', 409);
    }
    if (carrier.mode !== 'mock') {
      throw new ShipmentError('Adapter live của hãng vận chuyển chưa được cấu hình.', 'carrier_live_not_configured', 503);
    }

    const currentIndex = Math.max(0, MOCK_STATUS_FLOW.indexOf(shipment.latest_status));
    const nextStatus = MOCK_STATUS_FLOW[Math.min(currentIndex + 1, MOCK_STATUS_FLOW.length - 1)]!;
    const timestamp = nowIso();
    const jobId = createId('shipment_sync');
    this.database.transaction(() => {
      this.database.prepare(`
        INSERT INTO shipment_sync_jobs(id, shipment_id, status, attempts, created_at, updated_at)
        VALUES (?, ?, 'running', 1, ?, ?)
      `).run(jobId, shipmentId, timestamp, timestamp);
      if (nextStatus !== shipment.latest_status) this.insertEvent(shipmentId, nextStatus, timestamp);
      const eta = nextStatus === 'DELIVERED'
        ? timestamp
        : new Date(Date.now() + (MOCK_STATUS_FLOW.length - 1 - MOCK_STATUS_FLOW.indexOf(nextStatus)) * 86_400_000).toISOString();
      this.database.prepare(`
        UPDATE shipments SET latest_status = ?, last_synced_at = ?, eta = ?, updated_at = ? WHERE id = ?
      `).run(nextStatus, timestamp, eta, timestamp, shipmentId);
      this.database.prepare(`
        UPDATE shipment_sync_jobs SET status = 'completed', updated_at = ? WHERE id = ?
      `).run(timestamp, jobId);
    })();
    return this.get(userId, shipmentId);
  }

  private insertEvent(shipmentId: string, status: ShipmentStatus, occurredAt: string) {
    const eventHash = sha256(`${shipmentId}|${status}`);
    this.database.prepare(`
      INSERT OR IGNORE INTO shipment_events(id, shipment_id, event_hash, status, location, description, occurred_at)
      VALUES (?, ?, ?, ?, NULL, ?, ?)
    `).run(createId('shipment_event'), shipmentId, eventHash, status, descriptions[status], occurredAt);
  }
}

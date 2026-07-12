export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const migrations: readonly Migration[] = [
  {
    version: 1,
    name: 'core_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        public_id TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL UNIQUE,
        email TEXT UNIQUE,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','support','operation','finance','admin')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS otp_challenges (
        id TEXT PRIMARY KEY,
        phone TEXT NOT NULL,
        purpose TEXT NOT NULL CHECK (purpose IN ('login','password_reset')),
        code_hash TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        expires_at TEXT NOT NULL,
        consumed_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_otp_phone_purpose ON otp_challenges(phone, purpose, created_at DESC);
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL CHECK (platform IN ('shopee','tiktok')),
        external_item_id TEXT,
        external_shop_id TEXT,
        name TEXT NOT NULL,
        shop_name TEXT,
        image_url TEXT,
        price_vnd INTEGER NOT NULL DEFAULT 0 CHECK (price_vnd >= 0),
        original_price_vnd INTEGER NOT NULL DEFAULT 0 CHECK (original_price_vnd >= 0),
        source_url TEXT NOT NULL,
        source_payload_json TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_product_external ON products(platform, external_shop_id, external_item_id);
      CREATE TABLE IF NOT EXISTS affiliate_links (
        id TEXT PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL REFERENCES users(id),
        platform TEXT NOT NULL CHECK (platform IN ('shopee','tiktok')),
        origin_url TEXT NOT NULL,
        normalized_url TEXT NOT NULL,
        provider_url TEXT NOT NULL,
        tracking_tag TEXT NOT NULL UNIQUE,
        provider_payload_json TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','failed')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_links_user_created ON affiliate_links(user_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS affiliate_clicks (
        id TEXT PRIMARY KEY,
        affiliate_link_id TEXT NOT NULL REFERENCES affiliate_links(id),
        user_id TEXT REFERENCES users(id),
        ip_hash TEXT,
        user_agent TEXT,
        referer TEXT,
        clicked_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_clicks_link ON affiliate_clicks(affiliate_link_id, clicked_at DESC);

      CREATE TABLE IF NOT EXISTS conversions (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL CHECK (platform IN ('shopee','tiktok')),
        external_conversion_id TEXT NOT NULL,
        affiliate_link_id TEXT REFERENCES affiliate_links(id),
        user_id TEXT REFERENCES users(id),
        tracking_tag TEXT,
        status TEXT NOT NULL CHECK (status IN ('pending','confirmed','rejected','paid')),
        gross_commission_vnd INTEGER NOT NULL DEFAULT 0,
        net_commission_vnd INTEGER NOT NULL DEFAULT 0,
        source_payload_json TEXT NOT NULL,
        purchased_at TEXT,
        updated_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(platform, external_conversion_id)
      );
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        conversion_id TEXT NOT NULL REFERENCES conversions(id),
        external_order_id TEXT NOT NULL,
        status TEXT NOT NULL,
        order_value_vnd INTEGER NOT NULL DEFAULT 0,
        cashback_estimate_vnd INTEGER NOT NULL DEFAULT 0,
        cashback_actual_vnd INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        updated_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(conversion_id, external_order_id)
      );
      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        external_item_id TEXT,
        name TEXT NOT NULL,
        image_url TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        amount_vnd INTEGER NOT NULL DEFAULT 0,
        commission_vnd INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS cashback_rules (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT '*',
        user_share_bps INTEGER NOT NULL CHECK (user_share_bps BETWEEN 0 AND 10000),
        withholding_tax_bps INTEGER NOT NULL CHECK (withholding_tax_bps BETWEEN 0 AND 10000),
        approval_days INTEGER NOT NULL DEFAULT 30,
        version TEXT NOT NULL UNIQUE,
        active INTEGER NOT NULL DEFAULT 1,
        effective_from TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS wallet_accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
        currency TEXT NOT NULL DEFAULT 'VND',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ledger_entries (
        id TEXT PRIMARY KEY,
        wallet_account_id TEXT NOT NULL REFERENCES wallet_accounts(id),
        type TEXT NOT NULL,
        amount_vnd INTEGER NOT NULL CHECK (amount_vnd <> 0),
        idempotency_key TEXT NOT NULL UNIQUE,
        reference_type TEXT NOT NULL,
        reference_id TEXT NOT NULL,
        policy_version TEXT,
        description TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ledger_wallet_created ON ledger_entries(wallet_account_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        amount_vnd INTEGER NOT NULL CHECK (amount_vnd > 0),
        bank_name TEXT NOT NULL,
        bank_account_masked TEXT NOT NULL,
        bank_account_ciphertext TEXT NOT NULL,
        account_name TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','paid')),
        transaction_code TEXT,
        reviewed_by TEXT REFERENCES users(id),
        reviewed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS shipments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        order_id TEXT REFERENCES orders(id),
        tracking_number TEXT NOT NULL,
        carrier_code TEXT NOT NULL,
        latest_status TEXT NOT NULL,
        last_synced_at TEXT,
        eta TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, carrier_code, tracking_number)
      );
      CREATE TABLE IF NOT EXISTS shipment_events (
        id TEXT PRIMARY KEY,
        shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
        event_hash TEXT NOT NULL,
        status TEXT NOT NULL,
        location TEXT,
        description TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        UNIQUE(shipment_id, event_hash)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        deep_link TEXT,
        read_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS webhook_events (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        external_event_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        signature_valid INTEGER NOT NULL,
        processed_at TEXT,
        error TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(provider, external_event_id)
      );
      CREATE TABLE IF NOT EXISTS sync_cursors (
        provider TEXT NOT NULL,
        stream TEXT NOT NULL,
        cursor TEXT,
        last_synced_at TEXT,
        updated_at TEXT NOT NULL,
        PRIMARY KEY(provider, stream)
      );
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        actor_user_id TEXT REFERENCES users(id),
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        metadata_json TEXT,
        ip_hash TEXT,
        created_at TEXT NOT NULL
      );
    `,
  },
  {
    version: 2,
    name: 'operations_and_double_entry',
    sql: `
      CREATE TABLE IF NOT EXISTS cashback_policies (
        id TEXT PRIMARY KEY,
        version TEXT NOT NULL UNIQUE,
        user_share_bps INTEGER NOT NULL CHECK (user_share_bps BETWEEN 0 AND 10000),
        withholding_tax_bps INTEGER NOT NULL CHECK (withholding_tax_bps BETWEEN 0 AND 10000),
        effective_from TEXT NOT NULL,
        effective_to TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS cashback_policy_rules (
        id TEXT PRIMARY KEY,
        policy_id TEXT NOT NULL REFERENCES cashback_policies(id),
        platform TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT '*',
        approval_days INTEGER NOT NULL DEFAULT 30,
        active INTEGER NOT NULL DEFAULT 1,
        UNIQUE(policy_id, platform, category)
      );
      CREATE TABLE IF NOT EXISTS settlement_reports (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        external_validation_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('imported','reconciled','failed')),
        gross_commission_vnd INTEGER NOT NULL DEFAULT 0,
        mcn_fee_vnd INTEGER NOT NULL DEFAULT 0,
        provider_service_fee_vnd INTEGER NOT NULL DEFAULT 0,
        tax_withheld_vnd INTEGER NOT NULL DEFAULT 0,
        distributable_net_vnd INTEGER NOT NULL DEFAULT 0,
        raw_payload_hash TEXT NOT NULL,
        observed_at TEXT NOT NULL,
        reconciled_at TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(platform, external_validation_id)
      );
      CREATE TABLE IF NOT EXISTS settlement_items (
        id TEXT PRIMARY KEY,
        settlement_report_id TEXT NOT NULL REFERENCES settlement_reports(id),
        conversion_id TEXT NOT NULL REFERENCES conversions(id),
        external_order_id TEXT NOT NULL,
        external_item_id TEXT NOT NULL,
        model_id TEXT NOT NULL DEFAULT '',
        actual_commission_vnd INTEGER NOT NULL DEFAULT 0,
        raw_payload_hash TEXT NOT NULL,
        UNIQUE(settlement_report_id, conversion_id, external_order_id, external_item_id, model_id)
      );

      CREATE TABLE IF NOT EXISTS wallet_buckets (
        wallet_account_id TEXT NOT NULL REFERENCES wallet_accounts(id),
        bucket TEXT NOT NULL CHECK (bucket IN ('pending','available','reserved','withdrawn')),
        balance_vnd INTEGER NOT NULL DEFAULT 0 CHECK (balance_vnd >= 0),
        updated_at TEXT NOT NULL,
        PRIMARY KEY(wallet_account_id, bucket)
      );
      CREATE TABLE IF NOT EXISTS wallet_journals (
        id TEXT PRIMARY KEY,
        idempotency_key TEXT NOT NULL UNIQUE,
        reference_type TEXT NOT NULL,
        reference_id TEXT NOT NULL,
        description TEXT NOT NULL,
        policy_version TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS wallet_postings (
        id TEXT PRIMARY KEY,
        journal_id TEXT NOT NULL REFERENCES wallet_journals(id) ON DELETE CASCADE,
        wallet_account_id TEXT NOT NULL REFERENCES wallet_accounts(id),
        bucket TEXT NOT NULL CHECK (bucket IN ('pending','available','reserved','withdrawn')),
        amount_vnd INTEGER NOT NULL CHECK (amount_vnd <> 0),
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_postings_wallet ON wallet_postings(wallet_account_id, created_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_withdrawal_idempotency ON withdrawal_requests(user_id, id, created_at);

      CREATE TABLE IF NOT EXISTS bank_accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        bank_code TEXT NOT NULL,
        bank_name TEXT NOT NULL,
        account_number_masked TEXT NOT NULL,
        account_number_ciphertext TEXT NOT NULL,
        account_name TEXT NOT NULL,
        verified_at TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS saved_products (
        user_id TEXT NOT NULL REFERENCES users(id),
        product_id TEXT NOT NULL REFERENCES products(id),
        created_at TEXT NOT NULL,
        PRIMARY KEY(user_id, product_id)
      );
      CREATE TABLE IF NOT EXISTS notification_preferences (
        user_id TEXT PRIMARY KEY REFERENCES users(id),
        in_app INTEGER NOT NULL DEFAULT 1,
        email INTEGER NOT NULL DEFAULT 0,
        push INTEGER NOT NULL DEFAULT 0,
        shipment_updates INTEGER NOT NULL DEFAULT 1,
        cashback_updates INTEGER NOT NULL DEFAULT 1,
        promotions INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS support_tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        subject TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT NOT NULL CHECK (priority IN ('low','medium','high')),
        status TEXT NOT NULL CHECK (status IN ('open','resolved','closed')),
        linked_order_id TEXT REFERENCES orders(id),
        assigned_to TEXT REFERENCES users(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS support_messages (
        id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        sender_user_id TEXT REFERENCES users(id),
        sender_type TEXT NOT NULL CHECK (sender_type IN ('user','agent','system')),
        body TEXT NOT NULL,
        attachment_url TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS point_accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
        balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS point_ledger_entries (
        id TEXT PRIMARY KEY,
        point_account_id TEXT NOT NULL REFERENCES point_accounts(id),
        amount INTEGER NOT NULL CHECK (amount <> 0),
        idempotency_key TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS giftcodes (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        reward_type TEXT NOT NULL CHECK (reward_type IN ('wallet','points')),
        reward_amount INTEGER NOT NULL CHECK (reward_amount > 0),
        usage_limit INTEGER,
        used_count INTEGER NOT NULL DEFAULT 0,
        starts_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS giftcode_redemptions (
        id TEXT PRIMARY KEY,
        giftcode_id TEXT NOT NULL REFERENCES giftcodes(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        journal_id TEXT REFERENCES wallet_journals(id),
        point_ledger_entry_id TEXT REFERENCES point_ledger_entries(id),
        created_at TEXT NOT NULL,
        UNIQUE(giftcode_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY,
        referrer_user_id TEXT NOT NULL REFERENCES users(id),
        referred_user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
        status TEXT NOT NULL CHECK (status IN ('pending','qualified','rewarded','rejected')),
        qualified_at TEXT,
        rewarded_at TEXT,
        created_at TEXT NOT NULL,
        CHECK(referrer_user_id <> referred_user_id)
      );

      CREATE TABLE IF NOT EXISTS carrier_configs (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        mode TEXT NOT NULL CHECK (mode IN ('disabled','mock','live')),
        enabled INTEGER NOT NULL DEFAULT 0,
        rate_limit_per_minute INTEGER,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS shipment_sync_jobs (
        id TEXT PRIMARY KEY,
        shipment_id TEXT NOT NULL REFERENCES shipments(id),
        status TEXT NOT NULL CHECK (status IN ('queued','running','retry','completed','failed')),
        attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt_at TEXT,
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS provider_sync_runs (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        stream TEXT NOT NULL,
        mode TEXT NOT NULL CHECK (mode IN ('live','mock')),
        status TEXT NOT NULL CHECK (status IN ('running','completed','failed')),
        window_start TEXT,
        window_end TEXT,
        page_count INTEGER NOT NULL DEFAULT 0,
        record_count INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        started_at TEXT NOT NULL,
        finished_at TEXT
      );
    `,
  },
  {
    version: 3,
    name: 'withdrawal_idempotency',
    sql: `
      ALTER TABLE withdrawal_requests ADD COLUMN idempotency_key TEXT;
      ALTER TABLE withdrawal_requests ADD COLUMN rejection_reason TEXT;
      ALTER TABLE withdrawal_requests ADD COLUMN fee_vnd INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE withdrawal_requests ADD COLUMN net_amount_vnd INTEGER NOT NULL DEFAULT 0;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_withdrawal_request_key ON withdrawal_requests(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
    `,
  },
  {
    version: 4,
    name: 'finance_admin_idempotency',
    sql: `
      ALTER TABLE settlement_reports ADD COLUMN sync_run_id TEXT REFERENCES provider_sync_runs(id);
      CREATE INDEX IF NOT EXISTS idx_settlement_reports_sync_run ON settlement_reports(sync_run_id);
      CREATE INDEX IF NOT EXISTS idx_settlement_items_conversion ON settlement_items(conversion_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_withdrawal_transaction_code
        ON withdrawal_requests(transaction_code) WHERE transaction_code IS NOT NULL;

      CREATE TABLE IF NOT EXISTS admin_idempotency_keys (
        id TEXT PRIMARY KEY,
        actor_user_id TEXT NOT NULL REFERENCES users(id),
        scope TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        response_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(actor_user_id, scope, idempotency_key)
      );
    `,
  },
  {
    version: 5,
    name: 'email_and_google_authentication',
    sql: `
      -- The existing users.phone column remains for legacy records. New email/OAuth
      -- users receive an opaque internal value there and it is never returned by the API.
      CREATE TABLE IF NOT EXISTS auth_identities (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL CHECK (provider IN ('password', 'google')),
        provider_subject TEXT NOT NULL,
        email TEXT NOT NULL COLLATE NOCASE,
        password_hash TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(provider, provider_subject),
        UNIQUE(email)
      );
      CREATE INDEX IF NOT EXISTS idx_auth_identities_user ON auth_identities(user_id);

      CREATE TABLE IF NOT EXISTS password_login_attempts (
        email TEXT PRIMARY KEY COLLATE NOCASE,
        failures INTEGER NOT NULL DEFAULT 0,
        first_failed_at TEXT NOT NULL,
        locked_until TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS google_oauth_states (
        state_hash TEXT PRIMARY KEY,
        nonce TEXT NOT NULL,
        redirect_path TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_google_oauth_states_expiry ON google_oauth_states(expires_at);
    `,
  },
  {
    version: 6,
    name: 'password_reset_challenges',
    sql: `
      CREATE TABLE IF NOT EXISTS password_reset_challenges (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL COLLATE NOCASE,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        code_hash TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        expires_at TEXT NOT NULL,
        consumed_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_password_reset_email_created
        ON password_reset_challenges(email, created_at DESC);
    `,
  },
  {
    version: 7,
    name: 'offline_payout_batches',
    sql: `
      -- These tables model an internal, offline review workflow only. They do
      -- not represent a bank instruction or evidence of a completed payment.
      CREATE TABLE IF NOT EXISTS payout_batches (
        id TEXT PRIMARY KEY,
        reference TEXT NOT NULL UNIQUE,
        memo TEXT,
        gateway_mode TEXT NOT NULL CHECK (gateway_mode = 'deterministic_mock'),
        status TEXT NOT NULL CHECK (status IN ('draft','approved','mock_submitted','reconciled')),
        created_by TEXT NOT NULL REFERENCES users(id),
        checked_by TEXT REFERENCES users(id),
        checked_at TEXT,
        submitted_at TEXT,
        reconciled_at TEXT,
        reconciliation_summary_json TEXT,
        idempotency_key TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(created_by, idempotency_key)
      );
      CREATE INDEX IF NOT EXISTS idx_payout_batches_status_created
        ON payout_batches(status, created_at DESC);

      CREATE TABLE IF NOT EXISTS payout_batch_items (
        id TEXT PRIMARY KEY,
        payout_batch_id TEXT NOT NULL REFERENCES payout_batches(id) ON DELETE CASCADE,
        withdrawal_request_id TEXT NOT NULL UNIQUE REFERENCES withdrawal_requests(id),
        amount_vnd INTEGER NOT NULL CHECK (amount_vnd > 0),
        bank_name TEXT NOT NULL,
        bank_account_masked TEXT NOT NULL,
        account_name TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('queued','mock_submitted','reconciled_mock')),
        mock_gateway_reference TEXT,
        mock_gateway_status TEXT CHECK (mock_gateway_status IN ('accepted')),
        reconciliation_status TEXT NOT NULL DEFAULT 'pending' CHECK (reconciliation_status IN ('pending','matched_mock')),
        reconciliation_note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(payout_batch_id, withdrawal_request_id)
      );
      CREATE INDEX IF NOT EXISTS idx_payout_batch_items_batch
        ON payout_batch_items(payout_batch_id, created_at);
    `,
  },
];

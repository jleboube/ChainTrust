-- Initial schema for ChainTrust
-- Users table: track known on-chain addresses / app users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  address TEXT UNIQUE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Content ownership registry mirror
CREATE TABLE IF NOT EXISTS contents (
  id SERIAL PRIMARY KEY,
  content_hash TEXT UNIQUE NOT NULL,
  ipfs_hash TEXT,
  title TEXT,
  description TEXT,
  owner_address TEXT,
  is_transferable BOOLEAN DEFAULT true,
  registered_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contents_owner ON contents(owner_address);

-- Escrow contracts mirror (from FreelanceEscrow.sol)
CREATE TABLE IF NOT EXISTS escrow_contracts (
  id SERIAL PRIMARY KEY,
  escrow_id BIGINT UNIQUE NOT NULL,
  client TEXT,
  freelancer TEXT,
  mediator TEXT,
  amount NUMERIC(78,0), -- store amounts in wei for precision
  token TEXT, -- token address or '0x0' for native
  status SMALLINT,
  deadline TIMESTAMPTZ,
  work_description TEXT,
  delivery_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_updated TIMESTAMPTZ,
  client_approved BOOLEAN DEFAULT false,
  freelancer_submitted BOOLEAN DEFAULT false,
  tx_hash TEXT,
  gas_used TEXT
);
CREATE INDEX IF NOT EXISTS idx_escrow_client ON escrow_contracts(client);
CREATE INDEX IF NOT EXISTS idx_escrow_freelancer ON escrow_contracts(freelancer);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON escrow_contracts(status);

-- Mediators (approved by contract owner)
CREATE TABLE IF NOT EXISTS mediators (
  id SERIAL PRIMARY KEY,
  address TEXT UNIQUE NOT NULL,
  approved BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions table for general on-chain activity tracking
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  tx_hash TEXT UNIQUE NOT NULL,
  from_address TEXT,
  to_address TEXT,
  value NUMERIC(78,0),
  token TEXT,
  block_number BIGINT,
  status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_address);

-- Subscription pools (from SubscriptionPool.sol)
CREATE TABLE IF NOT EXISTS subscription_pools (
  id SERIAL PRIMARY KEY,
  pool_id BIGINT UNIQUE NOT NULL,
  owner TEXT,
  service_name TEXT,
  monthly_amount NUMERIC(78,0),
  token TEXT,
  max_members INT,
  current_members INT DEFAULT 0,
  status SMALLINT,
  next_payment_due TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  failed_payments INT DEFAULT 0,
  tx_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_pool_owner ON subscription_pools(owner);

-- Pool members mapping
CREATE TABLE IF NOT EXISTS pool_members (
  id SERIAL PRIMARY KEY,
  pool_id BIGINT NOT NULL,
  member_address TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_payment TIMESTAMPTZ,
  failed_payment_count INT DEFAULT 0,
  total_paid NUMERIC(78,0) DEFAULT 0,
  UNIQUE(pool_id, member_address)
);
CREATE INDEX IF NOT EXISTS idx_pool_members ON pool_members(pool_id);

-- Payments collected from pool members
CREATE TABLE IF NOT EXISTS pool_payments (
  id SERIAL PRIMARY KEY,
  pool_id BIGINT NOT NULL,
  member_address TEXT NOT NULL,
  amount NUMERIC(78,0),
  status TEXT,
  paid_at TIMESTAMPTZ DEFAULT now(),
  tx_hash TEXT,
  metadata JSONB
);
CREATE INDEX IF NOT EXISTS idx_pool_payments_pool ON pool_payments(pool_id);

-- Payouts to pool owners / fee recipient
CREATE TABLE IF NOT EXISTS pool_payouts (
  id SERIAL PRIMARY KEY,
  pool_id BIGINT NOT NULL,
  owner_amount NUMERIC(78,0),
  fee_amount NUMERIC(78,0),
  processed_at TIMESTAMPTZ DEFAULT now(),
  tx_hash TEXT
);

-- Generic audit/events for escrow actions
CREATE TABLE IF NOT EXISTS escrow_events (
  id SERIAL PRIMARY KEY,
  escrow_id BIGINT NOT NULL,
  event_type TEXT,
  actor TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_escrow_events_escrow ON escrow_events(escrow_id);

-- Foreign key constraints and cascading behavior
-- Link content owner to users.address (set null if user removed)
ALTER TABLE IF EXISTS contents
  ADD CONSTRAINT fk_contents_owner FOREIGN KEY (owner_address) REFERENCES users(address) ON DELETE SET NULL ON UPDATE CASCADE;

-- Link escrow parties to users.address (set null if user removed)
ALTER TABLE IF EXISTS escrow_contracts
  ADD CONSTRAINT fk_escrow_client FOREIGN KEY (client) REFERENCES users(address) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE IF EXISTS escrow_contracts
  ADD CONSTRAINT fk_escrow_freelancer FOREIGN KEY (freelancer) REFERENCES users(address) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE IF EXISTS escrow_contracts
  ADD CONSTRAINT fk_escrow_mediator FOREIGN KEY (mediator) REFERENCES users(address) ON DELETE SET NULL ON UPDATE CASCADE;

-- Transactions foreign keys to users (from/to) set null if user removed
ALTER TABLE IF EXISTS transactions
  ADD CONSTRAINT fk_tx_from FOREIGN KEY (from_address) REFERENCES users(address) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE IF EXISTS transactions
  ADD CONSTRAINT fk_tx_to FOREIGN KEY (to_address) REFERENCES users(address) ON DELETE SET NULL ON UPDATE CASCADE;

-- Subscription pool owner links to users (set null if owner removed)
ALTER TABLE IF EXISTS subscription_pools
  ADD CONSTRAINT fk_pool_owner FOREIGN KEY (owner) REFERENCES users(address) ON DELETE SET NULL ON UPDATE CASCADE;

-- Pool members reference users and cascade delete when user removed
ALTER TABLE IF EXISTS pool_members
  ADD CONSTRAINT fk_pool_member_address FOREIGN KEY (member_address) REFERENCES users(address) ON DELETE CASCADE ON UPDATE CASCADE;

-- Pool payments member reference
ALTER TABLE IF EXISTS pool_payments
  ADD CONSTRAINT fk_pool_payments_member FOREIGN KEY (member_address) REFERENCES users(address) ON DELETE SET NULL ON UPDATE CASCADE;

-- Pool payouts reference pool by pool_id; cascade when pool removed
ALTER TABLE IF EXISTS pool_payouts
  ADD CONSTRAINT fk_payouts_pool FOREIGN KEY (pool_id) REFERENCES subscription_pools(pool_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Pool members reference pool
ALTER TABLE IF EXISTS pool_members
  ADD CONSTRAINT fk_pool_members_pool FOREIGN KEY (pool_id) REFERENCES subscription_pools(pool_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Escrow events reference escrow_contracts
ALTER TABLE IF EXISTS escrow_events
  ADD CONSTRAINT fk_escrow_events_escrow FOREIGN KEY (escrow_id) REFERENCES escrow_contracts(escrow_id) ON DELETE CASCADE ON UPDATE CASCADE;

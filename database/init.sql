-- ChainTrust Database Schema
-- This script initializes the database with required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Content ownership tracking table
CREATE TABLE IF NOT EXISTS content_registry (
    id SERIAL PRIMARY KEY,
    content_hash VARCHAR(256) NOT NULL UNIQUE,
    owner_address VARCHAR(42) NOT NULL,
    ipfs_hash VARCHAR(256),
    ipfs_url TEXT,
    title VARCHAR(500),
    description TEXT,
    file_type VARCHAR(100),
    file_size BIGINT,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tx_hash VARCHAR(66),
    block_number BIGINT,
    gas_used BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Escrow contracts table
CREATE TABLE IF NOT EXISTS escrow_contracts (
    id SERIAL PRIMARY KEY,
    contract_address VARCHAR(42),
    escrow_id BIGINT NOT NULL,
    client_address VARCHAR(42) NOT NULL,
    freelancer_address VARCHAR(42) NOT NULL,
    mediator_address VARCHAR(42),
    amount DECIMAL(36, 18) NOT NULL, -- Support for large numbers with decimals
    currency VARCHAR(10) DEFAULT 'ETH',
    status VARCHAR(20) DEFAULT 'created', -- created, funded, work_submitted, completed, disputed, resolved
    title VARCHAR(500),
    description TEXT,
    deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    funded_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    tx_hash VARCHAR(66),
    block_number BIGINT
);

-- Subscription pool table
CREATE TABLE IF NOT EXISTS subscription_pool (
    id SERIAL PRIMARY KEY,
    subscriber_address VARCHAR(42) NOT NULL,
    pool_id BIGINT,
    amount DECIMAL(36, 18) NOT NULL,
    duration_days INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'active', -- active, expired, cancelled
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    tx_hash VARCHAR(66),
    block_number BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- File uploads tracking
CREATE TABLE IF NOT EXISTS file_uploads (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4(),
    original_filename VARCHAR(500),
    stored_filename VARCHAR(500),
    file_path TEXT,
    file_size BIGINT,
    mime_type VARCHAR(200),
    content_hash VARCHAR(256),
    ipfs_hash VARCHAR(256),
    ipfs_url TEXT,
    uploader_address VARCHAR(42),
    status VARCHAR(20) DEFAULT 'uploaded', -- uploaded, processing, registered, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- User sessions/authentication (if needed)
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL,
    session_token VARCHAR(256) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Verification requests log
CREATE TABLE IF NOT EXISTS verification_requests (
    id SERIAL PRIMARY KEY,
    content_hash VARCHAR(256) NOT NULL,
    requester_ip INET,
    user_agent TEXT,
    verified BOOLEAN DEFAULT FALSE,
    verification_details JSONB,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_registry_hash ON content_registry(content_hash);
CREATE INDEX IF NOT EXISTS idx_content_registry_owner ON content_registry(owner_address);
CREATE INDEX IF NOT EXISTS idx_content_registry_registered_at ON content_registry(registered_at);

CREATE INDEX IF NOT EXISTS idx_escrow_contracts_client ON escrow_contracts(client_address);
CREATE INDEX IF NOT EXISTS idx_escrow_contracts_freelancer ON escrow_contracts(freelancer_address);
CREATE INDEX IF NOT EXISTS idx_escrow_contracts_status ON escrow_contracts(status);
CREATE INDEX IF NOT EXISTS idx_escrow_contracts_created_at ON escrow_contracts(created_at);

CREATE INDEX IF NOT EXISTS idx_subscription_pool_subscriber ON subscription_pool(subscriber_address);
CREATE INDEX IF NOT EXISTS idx_subscription_pool_status ON subscription_pool(status);
CREATE INDEX IF NOT EXISTS idx_subscription_pool_expires_at ON subscription_pool(expires_at);

CREATE INDEX IF NOT EXISTS idx_file_uploads_hash ON file_uploads(content_hash);
CREATE INDEX IF NOT EXISTS idx_file_uploads_uploader ON file_uploads(uploader_address);
CREATE INDEX IF NOT EXISTS idx_file_uploads_status ON file_uploads(status);

CREATE INDEX IF NOT EXISTS idx_user_sessions_wallet ON user_sessions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_verification_requests_hash ON verification_requests(content_hash);
CREATE INDEX IF NOT EXISTS idx_verification_requests_requested_at ON verification_requests(requested_at);

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to tables with updated_at columns
CREATE TRIGGER update_content_registry_updated_at 
    BEFORE UPDATE ON content_registry 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escrow_contracts_updated_at 
    BEFORE UPDATE ON escrow_contracts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional)
-- Uncomment the following lines if you want sample data

/*
INSERT INTO content_registry (content_hash, owner_address, title, description, file_type) 
VALUES 
    ('0x1234567890abcdef1234567890abcdef12345678', '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', 'Sample Document', 'A sample document for testing', 'application/pdf'),
    ('0xfedcba0987654321fedcba0987654321fedcba09', '0x1234567890123456789012345678901234567890', 'Test Image', 'A test image file', 'image/jpeg')
ON CONFLICT (content_hash) DO NOTHING;
*/

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO chaintrust;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO chaintrust;
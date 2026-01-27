-- Deposit Address Book Schema
-- Stores deposit addresses for cross-exchange transfers
-- SECURITY: Only store addresses from official sources (manual input or official API)

CREATE TABLE IF NOT EXISTS deposit_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Exchange and asset identification
    exchange_id VARCHAR(50) NOT NULL,  -- e.g., 'BITHUMB', 'BINANCE', 'UPBIT'
    symbol VARCHAR(20) NOT NULL,       -- e.g., 'BTC', 'ETH', 'XRP'
    network_id VARCHAR(50) NOT NULL,   -- Canonical network ID e.g., 'BTC', 'ETH-ERC20', 'XRP'

    -- Deposit address details
    address VARCHAR(255) NOT NULL,     -- Blockchain address
    memo VARCHAR(100),                 -- Memo/tag/destination tag (nullable)

    -- Status and metadata
    is_active BOOLEAN DEFAULT true,    -- Whether this address is currently active
    source VARCHAR(20) NOT NULL CHECK (source IN ('MANUAL', 'API')),  -- How address was obtained
    verified_at TIMESTAMPTZ,           -- When address was verified as working

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    -- Unique constraint: one address per exchange/symbol/network combination
    CONSTRAINT unique_deposit_address UNIQUE (exchange_id, symbol, network_id, address)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_lookup
ON deposit_addresses(exchange_id, symbol, network_id)
WHERE is_active = true;

-- Index for listing addresses by exchange
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_by_exchange
ON deposit_addresses(exchange_id, is_active);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_deposit_addresses_updated_at
BEFORE UPDATE ON deposit_addresses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE deposit_addresses IS 'Deposit addresses for cross-exchange crypto transfers. SECURITY: Only store addresses from official sources.';
COMMENT ON COLUMN deposit_addresses.exchange_id IS 'Target exchange identifier (uppercase)';
COMMENT ON COLUMN deposit_addresses.symbol IS 'Cryptocurrency symbol';
COMMENT ON COLUMN deposit_addresses.network_id IS 'Canonical blockchain network identifier';
COMMENT ON COLUMN deposit_addresses.address IS 'Blockchain deposit address';
COMMENT ON COLUMN deposit_addresses.memo IS 'Memo/tag/destination tag if required by network (e.g., XRP destination tag)';
COMMENT ON COLUMN deposit_addresses.source IS 'How address was obtained: MANUAL (user input) or API (from exchange API)';
COMMENT ON COLUMN deposit_addresses.verified_at IS 'Timestamp when address was last verified as working';

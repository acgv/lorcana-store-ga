-- Migration: Add marketPriceUSD and marketFoilPriceUSD columns to cards table
-- Description: Stores the USD market prices entered manually by admin for price calculation
-- Date: 2025-01-30

-- Add marketPriceUSD column (nullable, stores USD price for normal cards)
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS "marketPriceUSD" DECIMAL(10, 2) NULL;

-- Add marketFoilPriceUSD column (nullable, stores USD price for foil cards)
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS "marketFoilPriceUSD" DECIMAL(10, 2) NULL;

-- Add comment to columns
COMMENT ON COLUMN cards."marketPriceUSD" IS 'USD market price for normal card version, entered manually by admin';
COMMENT ON COLUMN cards."marketFoilPriceUSD" IS 'USD market price for foil card version, entered manually by admin';

-- Create index for faster queries (optional, but helpful if filtering by market prices)
CREATE INDEX IF NOT EXISTS idx_cards_market_price_usd ON cards("marketPriceUSD") WHERE "marketPriceUSD" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cards_market_foil_price_usd ON cards("marketFoilPriceUSD") WHERE "marketFoilPriceUSD" IS NOT NULL;


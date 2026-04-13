-- Run this in your Supabase SQL editor before using the outreach script

CREATE TABLE IF NOT EXISTS outreach (
  id               SERIAL PRIMARY KEY,
  business_name    TEXT,
  business_phone   TEXT,
  business_website TEXT,
  email_address    TEXT UNIQUE,   -- prevents duplicate sends
  industry         TEXT,
  status           TEXT DEFAULT 'sent',  -- sent | replied | unsubscribed | bounced
  sent_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes            TEXT DEFAULT ''
);

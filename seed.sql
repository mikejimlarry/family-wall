-- Seed data: initial family member "Mike"
-- Run locally:  npm run wrangler -- d1 execute family-wall --local --file=seed.sql
-- Run remotely: npm run wrangler -- d1 execute family-wall --file=seed.sql

INSERT OR IGNORE INTO family_members (id, name, color, emoji, created_at)
VALUES ('mike', 'Mike', '#60a5fa', '👤', unixepoch());

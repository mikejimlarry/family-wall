-- Seed data: initial family member "Mike"
-- Run locally:  npm run wrangler -- d1 execute family-wall --local --file=seed.sql
-- Run remotely: npm run wrangler -- d1 execute family-wall --file=seed.sql

INSERT OR IGNORE INTO family_members (id, name, color, emoji, created_at)
VALUES ('mike', 'Mike', '#60a5fa', '👤', unixepoch());

-- Default admin PIN — change this after first deploy
INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES ('admin.pin', '1234', unixepoch());

INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES ('weather.lat',  '39.1732',        unixepoch());
INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES ('weather.lon',  '-77.2717',       unixepoch());
INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES ('weather.city', 'Germantown, MD', unixepoch());
INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES ('weather.unit', 'fahrenheit',     unixepoch());

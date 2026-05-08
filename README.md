# Family Wall

A self-hosted family dashboard: calendar, chores, and more. Built with SvelteKit + Cloudflare Pages + D1.

## Features

- **Calendar** — monthly view with per-day event dots, member filtering, and manual event creation
- **Chore board** — assign chores to family members, mark complete, set due dates and recurrence
- **Touch-friendly** — designed for a wall-mounted tablet or monitor in kiosk mode

## Tech stack

- [SvelteKit](https://kit.svelte.dev/) + Svelte 5 (runes)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Cloudflare Pages](https://pages.cloudflare.com/) for hosting
- [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite at the edge)
- [Drizzle ORM](https://orm.drizzle.team/)

## Local development

The dev server uses **better-sqlite3** directly — no Wrangler or Cloudflare account needed.
Migrations run automatically on first start, and Mike is seeded into an empty database.

### 1. Install dependencies

```bash
npm install
```

### 2. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The `dev.db` file is created automatically on first run.

> **Wrangler preview** (`npm run preview`) requires macOS 13.5+ for the workerd runtime.
> Use `npm run dev` instead for local development on older macOS versions.

## Deploying to Cloudflare Pages

### 1. Create a D1 database

```bash
npm run wrangler -- d1 create family-wall
```

Copy the `database_id` from the output and replace the placeholder in `wrangler.jsonc`.

### 2. Push migrations to the remote database

Add `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID`, and `CLOUDFLARE_D1_TOKEN` to your `.env` file, then:

```bash
npm run db:migrate
```

### 3. Seed production data

```bash
npm run wrangler -- d1 execute family-wall --file=seed.sql
```

### 4. Deploy

Connect the GitHub repo to Cloudflare Pages in the dashboard, or use:

```bash
npm run build
npm run wrangler -- pages deploy .svelte-kit/cloudflare
```

## Adding family members

Edit `seed.sql` and add rows, or use the `/api/members` endpoint:

```bash
curl -X POST https://your-domain.pages.dev/api/members \
  -H 'Content-Type: application/json' \
  -d '{"name":"Sarah","color":"#f472b6","emoji":"🌸"}'
```

## Roadmap

- [ ] Google Calendar sync (OAuth)
- [ ] iCloud / CalDAV sync
- [ ] Weather widget
- [ ] Grocery / shopping list
- [ ] Smart home quick controls

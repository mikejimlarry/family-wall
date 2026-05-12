CREATE TABLE `calendar_feeds` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#60a5fa' NOT NULL,
	`last_synced_at` integer,
	`created_at` integer
);

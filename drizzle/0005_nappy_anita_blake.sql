CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`author_id` text,
	`pinned` integer DEFAULT false NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`author_id`) REFERENCES `family_members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `chores` ADD `points` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `family_members` ADD `points_earned` integer DEFAULT 0 NOT NULL;
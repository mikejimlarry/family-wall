ALTER TABLE `chores` ADD `streak_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `chores` ADD `last_approved_date` text;--> statement-breakpoint
ALTER TABLE `grocery_items` ADD `category` text DEFAULT 'Other' NOT NULL;

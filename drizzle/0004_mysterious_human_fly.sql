CREATE TABLE `grocery_items` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`checked` integer DEFAULT false NOT NULL,
	`checked_at` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `meal_plan` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`meal` text NOT NULL,
	`notes` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meal_plan_date_unique` ON `meal_plan` (`date`);
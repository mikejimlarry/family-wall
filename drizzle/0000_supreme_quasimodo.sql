CREATE TABLE `chores` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`assigned_to` text,
	`completed` integer DEFAULT false NOT NULL,
	`completed_at` integer,
	`due_date` text,
	`recurrence` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`assigned_to`) REFERENCES `family_members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`all_day` integer DEFAULT true NOT NULL,
	`member_id` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`external_id` text,
	`created_at` integer,
	FOREIGN KEY (`member_id`) REFERENCES `family_members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `family_members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#60a5fa' NOT NULL,
	`emoji` text DEFAULT '👤',
	`created_at` integer
);

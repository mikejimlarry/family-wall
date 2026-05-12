PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_chores` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`assigned_to` text,
	`completed` integer DEFAULT false NOT NULL,
	`completed_at` integer,
	`approved` integer DEFAULT false NOT NULL,
	`approved_at` integer,
	`due_date` text,
	`recurrence` text,
	`points` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_chores`("id", "title", "assigned_to", "completed", "completed_at", "approved", "approved_at", "due_date", "recurrence", "points", "sort_order", "created_at") SELECT "id", "title", "assigned_to", "completed", "completed_at", "approved", "approved_at", "due_date", "recurrence", "points", "sort_order", "created_at" FROM `chores`;--> statement-breakpoint
UPDATE `__new_chores` SET assigned_to = json_array(assigned_to) WHERE assigned_to IS NOT NULL AND assigned_to NOT LIKE '[%';--> statement-breakpoint
DROP TABLE `chores`;--> statement-breakpoint
ALTER TABLE `__new_chores` RENAME TO `chores`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
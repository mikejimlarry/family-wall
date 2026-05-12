import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const appSettings = sqliteTable('app_settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const familyMembers = sqliteTable('family_members', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	color: text('color').notNull().default('#60a5fa'),
	emoji: text('emoji').default('👤'),
	birthday: text('birthday'), // ISO date string e.g. "1990-05-08"
	role: text('role').notNull().default('child'), // 'parent' | 'child' | 'guest'
	pointsEarned: integer('points_earned').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const events = sqliteTable('events', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	startDate: text('start_date').notNull(),
	endDate: text('end_date'),
	allDay: integer('all_day', { mode: 'boolean' }).notNull().default(true),
	memberId: text('member_id').references(() => familyMembers.id, { onDelete: 'set null' }),
	source: text('source').notNull().default('manual'),
	externalId: text('external_id'),
	recurrenceRule: text('recurrence_rule'),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const chores = sqliteTable('chores', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	assignedTo: text('assigned_to'), // JSON array of member IDs e.g. '["id1","id2"]', null = everyone
	// completed = true means "child marked done, pending approval"
	completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
	completedAt: integer('completed_at', { mode: 'timestamp' }),
	// approved = true means "parent approved — hidden from main list"
	approved: integer('approved', { mode: 'boolean' }).notNull().default(false),
	approvedAt: integer('approved_at', { mode: 'timestamp' }),
	dueDate: text('due_date'),
	recurrence: text('recurrence'),
	points: integer('points').notNull().default(1),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const groceryItems = sqliteTable('grocery_items', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	checked: integer('checked', { mode: 'boolean' }).notNull().default(false),
	checkedAt: integer('checked_at', { mode: 'timestamp' }),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const mealPlan = sqliteTable('meal_plan', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	date: text('date').notNull().unique(), // ISO date "2026-05-08"
	meal: text('meal').notNull(),
	notes: text('notes'),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const calendarFeeds = sqliteTable('calendar_feeds', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	url: text('url').notNull(),
	name: text('name').notNull(),
	color: text('color').notNull().default('#60a5fa'),
	lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const routines = sqliteTable('routines', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	memberId: text('member_id').references(() => familyMembers.id, { onDelete: 'cascade' }),
	period: text('period').notNull(), // 'morning' | 'afternoon' | 'evening'
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const routineCompletions = sqliteTable('routine_completions', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	routineId: text('routine_id').notNull().references(() => routines.id, { onDelete: 'cascade' }),
	memberId: text('member_id').references(() => familyMembers.id, { onDelete: 'cascade' }),
	date: text('date').notNull(), // YYYY-MM-DD — auto-resets each new day
	completedAt: integer('completed_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
}, (t) => ({
	uniq: uniqueIndex('routine_completions_unique').on(t.routineId, t.memberId, t.date)
}));

export const messages = sqliteTable('messages', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	text: text('text').notNull(),
	authorId: text('author_id').references(() => familyMembers.id, { onDelete: 'set null' }),
	authorName: text('author_name'), // free-text override (admin only)
	pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

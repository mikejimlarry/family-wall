import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const chores = sqliteTable('chores', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	assignedTo: text('assigned_to').references(() => familyMembers.id, { onDelete: 'set null' }),
	// completed = true means "child marked done, pending approval"
	completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
	completedAt: integer('completed_at', { mode: 'timestamp' }),
	// approved = true means "parent approved — hidden from main list"
	approved: integer('approved', { mode: 'boolean' }).notNull().default(false),
	approvedAt: integer('approved_at', { mode: 'timestamp' }),
	dueDate: text('due_date'),
	recurrence: text('recurrence'),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

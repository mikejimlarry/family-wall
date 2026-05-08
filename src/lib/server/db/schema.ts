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
	completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
	completedAt: integer('completed_at', { mode: 'timestamp' }),
	dueDate: text('due_date'),
	recurrence: text('recurrence'),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

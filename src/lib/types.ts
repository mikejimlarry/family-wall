export type MemberRole = 'parent' | 'child' | 'guest';

export type Member = {
	id: string;
	name: string;
	color: string;
	emoji: string | null;
	birthday: string | null; // ISO date e.g. "1990-05-08"
	role: MemberRole;
	pointsEarned: number;
	createdAt: Date | null;
};

export type CalendarEvent = {
	id: string;
	title: string;
	startDate: string;
	endDate: string | null;
	allDay: boolean;
	memberId: string | null;
	source: string;
	externalId: string | null;
	recurrenceRule: string | null; // JSON-encoded RecurrenceRule
	createdAt: Date | null;
};

export type GroceryItem = {
	id: string;
	name: string;
	checked: boolean;
	checkedAt: Date | null;
	sortOrder: number;
	createdAt: Date | null;
};

export type MealPlan = {
	id: string;
	date: string; // ISO date "2026-05-08"
	meal: string;
	notes: string | null;
	createdAt: Date | null;
};

export type Chore = {
	id: string;
	title: string;
	assignedTo: string[]; // empty = everyone's chore
	completed: boolean;
	completedAt: Date | null;
	approved: boolean;
	approvedAt: Date | null;
	dueDate: string | null;
	recurrence: string | null;
	points: number;
	sortOrder: number;
	createdAt: Date | null;
};

export type RoutinePeriod = 'morning' | 'afternoon' | 'evening';

export type Routine = {
	id: string;
	title: string;
	memberId: string | null; // null = all members share this routine
	period: RoutinePeriod;
	sortOrder: number;
	createdAt: Date | null;
};

export type RoutineCompletion = {
	id: string;
	routineId: string;
	memberId: string | null;
	date: string;
	completedAt: Date | null;
};

export type CalendarFeed = {
	id: string;
	url: string;
	name: string;
	color: string;
	lastSyncedAt: Date | null;
	createdAt: Date | null;
};

export type Message = {
	id: string;
	text: string;
	authorId: string | null;
	authorName: string | null; // free-text override set by parent
	pinned: boolean;
	createdAt: Date | null;
};

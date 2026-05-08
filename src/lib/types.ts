export type Member = {
	id: string;
	name: string;
	color: string;
	emoji: string | null;
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
	createdAt: Date | null;
};

export type Chore = {
	id: string;
	title: string;
	assignedTo: string | null;
	completed: boolean;
	completedAt: Date | null;
	approved: boolean;
	approvedAt: Date | null;
	dueDate: string | null;
	recurrence: string | null;
	sortOrder: number;
	createdAt: Date | null;
};

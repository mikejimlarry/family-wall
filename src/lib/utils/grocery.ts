export const GROCERY_CATEGORIES = [
	'Produce',
	'Dairy',
	'Meat',
	'Bakery',
	'Pantry',
	'Frozen',
	'Household',
	'Other'
] as const;

const CATEGORY_KEYWORDS: Record<(typeof GROCERY_CATEGORIES)[number], string[]> = {
	Produce: ['apple', 'banana', 'berry', 'berries', 'carrot', 'lettuce', 'onion', 'potato', 'tomato', 'avocado', 'broccoli', 'spinach', 'pepper', 'fruit', 'salad'],
	Dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs'],
	Meat: ['chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'bacon', 'sausage'],
	Bakery: ['bread', 'bagel', 'tortilla', 'roll', 'bun', 'muffin'],
	Pantry: ['rice', 'pasta', 'beans', 'cereal', 'sauce', 'flour', 'sugar', 'oil', 'snack', 'chips', 'coffee', 'tea'],
	Frozen: ['frozen', 'ice cream', 'pizza'],
	Household: ['soap', 'paper', 'towel', 'toilet', 'detergent', 'trash', 'foil', 'battery'],
	Other: []
};

export function inferGroceryCategory(name: string): string {
	const lower = name.toLowerCase();
	for (const category of GROCERY_CATEGORIES) {
		if (category === 'Other') continue;
		if (CATEGORY_KEYWORDS[category].some((keyword) => lower.includes(keyword))) return category;
	}
	return 'Other';
}

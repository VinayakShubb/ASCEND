import type { Habit } from '../types';

interface HabitIntentRule {
  pattern: RegExp;
  meaning: string;
}

const HABIT_INTENT_RULES: HabitIntentRule[] = [
  {
    pattern: /\b(workout|gym|lift|lifting|cardio|run|running|jog|train|training|exercise|pushup|squat)\b/i,
    meaning: 'physical training and recovery discipline; measure by finishing the planned session',
  },
  {
    pattern: /\b(no\s*n|nonut|no\s*nut|nofap|no\s*fap|no\s*porn|dopamine detox|no social media)\b/i,
    meaning: 'impulse-control protocol; success means resisting urges and avoiding known triggers',
  },
  {
    pattern: /\b(study|revision|revise|lecture|class|notes|isa|exam|business)\b/i,
    meaning: 'focused academic study block; success means deep, distraction-free learning time',
  },
  {
    pattern: /\b(code|coding|build|project|ship|leetcode|dev)\b/i,
    meaning: 'skill-building output session; success means producing measurable work, not just planning',
  },
  {
    pattern: /\b(meditat|breath|prayer|mindful|journal|gratitude|reflection)\b/i,
    meaning: 'mental clarity routine; success means a completed reflective or mindfulness session',
  },
  {
    pattern: /\b(sleep|wake|morning|night|bed)\b/i,
    meaning: 'sleep/wake rhythm protocol; success means following the target schedule consistently',
  },
  {
    pattern: /\b(bath|shower|hygiene|clean)\b/i,
    meaning: 'personal hygiene baseline; success means completing the full routine on time',
  },
  {
    pattern: /\b(diet|meal|protein|water|hydrate|nutrition|calorie)\b/i,
    meaning: 'nutrition consistency protocol; success means meeting the planned intake target',
  },
];

const categoryFallbackMeaning = (category?: string): string => {
  const categoryKey = (category || '').toLowerCase();
  if (categoryKey.includes('health') || categoryKey.includes('fitness')) {
    return 'health discipline protocol; execute the planned routine with consistency';
  }
  if (categoryKey.includes('learning') || categoryKey.includes('career')) {
    return 'skill-growth protocol; complete focused, measurable progress work';
  }
  if (categoryKey.includes('mindful')) {
    return 'mindfulness protocol; complete a short focused reset';
  }
  if (categoryKey.includes('creative')) {
    return 'creative output protocol; produce concrete work, not only ideas';
  }
  return 'daily consistency protocol; complete it fully and on time';
};

const normalizeName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const inferHabitIntent = (name: string, category?: string): string => {
  const normalizedName = normalizeName(name);
  const matchedRule = HABIT_INTENT_RULES.find(rule => rule.pattern.test(normalizedName));
  return matchedRule ? matchedRule.meaning : categoryFallbackMeaning(category);
};

export const buildHabitIntentContext = (habits: Habit[]): string => {
  if (habits.length === 0) return '- No active protocols.';

  return habits
    .map(habit => `- ${habit.name}: ${inferHabitIntent(habit.name, habit.category)}`)
    .join('\n');
};


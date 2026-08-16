import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { Habit, HabitLog } from '../types';
import { calculateDisciplineIndex, calculateDailyCompletion, calculateWeightedScore, getStreak } from './calculations';
import { buildHabitIntentContext } from './habitIntent';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';
const BRIEF_CACHE_VERSION = 'v2';
const BRIEF_GRACE_DAYS = 3;
const VALID_STATUSES = ['elite', 'solid', 'slipping', 'critical'] as const;
type BriefStatus = (typeof VALID_STATUSES)[number];

export interface BriefOutput {
  status: BriefStatus;
  quote: string;
  motivation: string;
}

interface CachedBrief {
  date: string;
  insight: BriefOutput;
}

const getDaysSinceRegistration = (createdAt?: string): number => {
  if (!createdAt) return 1;
  const parsedDate = parseISO(createdAt);
  if (Number.isNaN(parsedDate.getTime())) return 1;
  return Math.max(1, differenceInCalendarDays(new Date(), parsedDate) + 1);
};

const getStatusFromIndex = (disciplineIndex: number, isGracePeriod: boolean): BriefStatus => {
  if (disciplineIndex >= 80) return 'elite';
  if (disciplineIndex >= 50) return 'solid';
  if (disciplineIndex >= 20) return 'slipping';
  return isGracePeriod ? 'slipping' : 'critical';
};

const clampStatusForGrace = (status: BriefStatus, isGracePeriod: boolean): BriefStatus => {
  if (!isGracePeriod) return status;
  return status === 'critical' ? 'slipping' : status;
};

const trimToWords = (text: string, maxWords: number): string => {
  const words = text.split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(' ');
};

const normalizeQuote = (quote: string): string => {
  const cleaned = quote
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^["']+|["']+$/g, '')
    .trim();
  const fallback = 'Discipline is built by what you finish today.';
  return trimToWords(cleaned || fallback, 18);
};

const normalizeMotivation = (motivation: string, isGracePeriod: boolean, username: string): string => {
  const defaults = isGracePeriod
    ? [
        `${username}, this is your setup phase. Focus on clean reps today.`,
        'Finish your next one or two protocols and build momentum.',
        'Small consistency now becomes your baseline next week.'
      ]
    : [
        'Execute your next protocol now and raise today\'s score.',
        'Momentum comes from finishing what is still open today.',
        'One clean push now changes tonight\'s result.'
      ];

  const parts = motivation
    .replace(/\r/g, '\n')
    .split(/\n+/)
    .flatMap(line => line.split(/(?<=[.!?])\s+/))
    .map(part => part.replace(/\s+/g, ' ').replace(/^["'\s-]+|["'\s-]+$/g, '').trim())
    .filter(Boolean);

  const lines = parts.slice(0, 3).map(line => trimToWords(line, 16)).filter(Boolean);

  while (lines.length < 2) {
    lines.push(defaults[lines.length]);
  }

  return lines.slice(0, 3).join('\n');
};

const buildFallbackBrief = (status: BriefStatus, isGracePeriod: boolean, username: string): BriefOutput => ({
  status: clampStatusForGrace(status, isGracePeriod),
  quote: isGracePeriod
    ? 'Start simple. Stack one clean win at a time.'
    : 'Your next action decides how this day ends.',
  motivation: normalizeMotivation('', isGracePeriod, username),
});

export async function getDailyBrief(
  username: string,
  habits: Habit[],
  logs: HabitLog[],
  forceRefresh: boolean = false,
  createdAt?: string
): Promise<BriefOutput | null> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    console.error('Groq API key not found in environment.');
    return null;
  }

  const todayFormatStr = format(new Date(), 'yyyy-MM-dd');
  const cacheKey = `ascend_ai_brief_${BRIEF_CACHE_VERSION}_${username}`;
  const historyKey = `ascend_ai_quote_history_${username}`;

  if (!forceRefresh) {
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        const cached: CachedBrief = JSON.parse(cachedStr);
        if (cached.date === todayFormatStr) {
          return cached.insight;
        }
      } catch (e) {
        console.error('Error parsing cached brief', e);
      }
    }
  }

  const activeHabits = habits.filter(h => !h.archived);
  const habitIntentContext = buildHabitIntentContext(activeHabits);
  const daysSinceRegistration = getDaysSinceRegistration(createdAt);
  const isGracePeriod = daysSinceRegistration <= BRIEF_GRACE_DAYS;
  const disciplineIndex = calculateDisciplineIndex(habits, logs);
  const todayWeightedScore = Math.round(calculateWeightedScore(habits, logs, todayFormatStr));
  const todayCompletionPercent = Math.round(calculateDailyCompletion(habits, logs, todayFormatStr));
  const targetStatus = getStatusFromIndex(disciplineIndex, isGracePeriod);
  const dayOfWeek = format(new Date(), 'EEEE');

  const habitDetails = activeHabits
    .map(habit => {
      const streak = getStreak(habit.id, logs, todayFormatStr);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      let weeklyCompletion = 0;
      const habitLogs = logs.filter(log => log.habit_id === habit.id && log.status === 'completed');

      for (let i = 0; i < 7; i++) {
        const day = new Date(sevenDaysAgo);
        day.setDate(day.getDate() + i);
        const checkDateStr = day.toISOString().split('T')[0];
        if (habitLogs.some(log => log.date === checkDateStr)) {
          weeklyCompletion++;
        }
      }

      const completedToday = habitLogs.some(log => log.date === todayFormatStr);
      return `- ${habit.name}: ${weeklyCompletion}/7 this week, ${streak} day streak, ${completedToday ? 'done today' : 'not done today'}`;
    })
    .join('\n');

  let quoteHistory: string[] = [];
  try {
    const historyRaw = localStorage.getItem(historyKey);
    if (historyRaw) {
      quoteHistory = JSON.parse(historyRaw);
    }
  } catch (e) {
    console.error('Error reading quote history', e);
  }

  const recentQuotes = quoteHistory.slice(-30);
  const forbiddenQuotesText = recentQuotes.length > 0
    ? `DO NOT use any of these quotes as they were used recently:\n${recentQuotes.map(q => `- "${q}"`).join('\n')}`
    : 'No quotes used recently.';

  const prompt = `You are the AI core of ASCEND. Generate a short Daily Mission Brief.

USER PERFORMANCE DATA:
- Username: ${username}
- Days since registration: ${daysSinceRegistration}
- Grace period active: ${isGracePeriod ? 'YES' : 'NO'} (grace days are days 1-3)
- Discipline Index (DI): ${disciplineIndex}/100
- Daily Weighted Score (DWS, today only): ${todayWeightedScore}/100
- Today's Completion: ${todayCompletionPercent}%
- Day: ${dayOfWeek}
- Protocols:
${habitDetails}
- Habit intent context:
${habitIntentContext}

MATH DEFINITIONS:
- DI = 7-day rolling average of daily weighted scores.
- DWS = single-day weighted score for today only.

TARGET STATUS BASED ON DATA: ${targetStatus}

TONE RULES:
- If grace period is active, be supportive and instructional.
- During grace period, NEVER shame/scold and NEVER return status "critical".
- Outside grace period: elite = appreciate and challenge; solid = direct and steady; slipping = sharp warning; critical = blunt urgency.

Respond ONLY with this exact JSON format:
{
  "status": "elite|solid|slipping|critical",
  "quote": "One short line, max 16 words. NEVER REPEAT A FORBIDDEN QUOTE.",
  "motivation": "2 or 3 short lines separated by \\n. Each line max 16 words. Actionable and easy to scan."
}

Rules:
- Follow the tone rules exactly.
- Use actual habit names from the data.
- Understand each habit using the provided Habit intent context.
- Mention at most 2 habit names total.
- Keep language simple and punchy.
- During grace period, avoid words like "failure", "regret", "pathetic", "waste".
- ${forbiddenQuotesText}

No markdown. No explanation outside the JSON.
IMPORTANT: Only reference habits and data explicitly provided.`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq API Error:', err);
      return buildFallbackBrief(targetStatus, isGracePeriod, username);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return buildFallbackBrief(targetStatus, isGracePeriod, username);
    }

    const parsedRaw = JSON.parse(content) as Partial<BriefOutput>;
    const parsedStatus = VALID_STATUSES.includes(parsedRaw.status as BriefStatus)
      ? (parsedRaw.status as BriefStatus)
      : targetStatus;

    const parsed: BriefOutput = {
      status: clampStatusForGrace(parsedStatus, isGracePeriod),
      quote: normalizeQuote(parsedRaw.quote || ''),
      motivation: normalizeMotivation(parsedRaw.motivation || '', isGracePeriod, username),
    };

    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        date: todayFormatStr,
        insight: parsed,
      })
    );

    quoteHistory.push(parsed.quote);
    localStorage.setItem(historyKey, JSON.stringify(quoteHistory));

    return parsed;
  } catch (error) {
    console.error('Error generating AI Daily Brief:', error);
    return buildFallbackBrief(targetStatus, isGracePeriod, username);
  }
}

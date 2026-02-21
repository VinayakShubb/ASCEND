import { format } from 'date-fns';
import type { Habit, HabitLog } from '../types';
import { calculateDisciplineIndex, calculateDailyCompletion, getStreak } from './calculations';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

export interface BriefOutput {
  status: 'elite' | 'solid' | 'slipping' | 'critical';
  quote: string;
  motivation: string;
}

interface CachedBrief {
  date: string;
  insight: BriefOutput;
}

export async function getDailyBrief(
  username: string,
  habits: Habit[],
  logs: HabitLog[],
  forceRefresh: boolean = false
): Promise<BriefOutput | null> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    console.error('Groq API key not found in environment.');
    return null;
  }

  const todayFormatStr = format(new Date(), 'yyyy-MM-dd');
  const cacheKey = `ascend_ai_brief_${username}`;
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
  const disciplineIndex = calculateDisciplineIndex(habits, logs);
  const todayCompletionPercent = Math.round(calculateDailyCompletion(habits, logs, todayFormatStr));
  const dayOfWeek = format(new Date(), 'EEEE');

  const habitDetails = activeHabits.map(h => {
    const streak = getStreak(h.id, logs, todayFormatStr);
    
    // Calculate weekly completion
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    let weeklyCompletion = 0;
    const habitLogs = logs.filter(l => l.habit_id === h.id && l.status === 'completed');
    
    for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo);
        d.setDate(d.getDate() + i);
        const checkDateStr = d.toISOString().split('T')[0];
        if (habitLogs.some(l => l.date === checkDateStr)) {
            weeklyCompletion++;
        }
    }

    const completedToday = habitLogs.some(l => l.date === todayFormatStr);
    return `  • ${h.name} — ${weeklyCompletion}/7 this week, ${streak} day streak, ${completedToday ? '✓ done today' : '✗ not done today'}`;
  }).join('\n');

  // Load quote history to prevent repetition
  let quoteHistory: string[] = [];
  try {
    const histStr = localStorage.getItem(historyKey);
    if (histStr) {
      quoteHistory = JSON.parse(histStr);
    }
  } catch (e) {
    console.error('Error reading quote history', e);
  }

  // Keep last 30 quotes to preserve prompt context window limits
  const recentQuotes = quoteHistory.slice(-30);
  const forbiddenQuotesText = recentQuotes.length > 0 
    ? `DO NOT use any of these quotes as they have been used recently:\n${recentQuotes.map(q => `- "${q}"`).join('\n')}`
    : 'No quotes used recently.';

  const prompt = `You are the AI core of ASCEND — a strict discipline coach. Your tone adapts exactly to the user's performance.
This is the Daily Mission Brief (start of the day motivation/ordering).

USER PERFORMANCE DATA:
- Username: ${username}
- Discipline Index: ${disciplineIndex}/100
- Today's Completion: ${todayCompletionPercent}%
- Day: ${dayOfWeek}
- Protocols:
${habitDetails}

Status thresholds and TONALITY RULES:
- elite (index >= 80): Tone = Appreciating, acknowledging high performance, commanding them to maintain the elite standard.
- solid (index >= 50): Tone = Balanced, direct. Acknowledge good work but push for more consistency.
- slipping (index >= 20): Tone = Sharp, warning. Point out the exact failures.
- critical (index < 20): Tone = Scolding, ordering, and brutal. Do not suggest; COMMAND them to fix their failures immediately for their own improvement.

Respond ONLY with this exact JSON format:
{
  "status": "elite|solid|slipping|critical",
  "quote": "1 line motivating/brutal quote depending on their tonality rule. NEVER REPEAT A DEFINED FORBIDDEN QUOTE.",
  "motivation": "A medium-length (3 to 5 sentences) motivation paragraph based on their current protocols and state. It should be highly readable, inspiring/commanding, and tell them exactly what to do without rambling."
}

Rules:
- Give a response that perfectly matches the Tonality Rule for their current status.
- Use actual habit names from the data.
- DO NOT mention the difficulty level in your response. Just use the name.
- ALWAYS generate a completely new random quote.
- EXTREMELY IMPORTANT: Keep the motivation length strictly between 3 and 5 sentences. It must be highly engaging and not cramped.
- ${forbiddenQuotesText}

No markdown. No explanation outside the JSON.
IMPORTANT: Only reference habits and data explicitly provided.`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9, // high temperature for randomness
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq API Error:', err);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) return null;

    const parsed: BriefOutput = JSON.parse(content);

    // Validate Status
    const validStatuses = ['elite', 'solid', 'slipping', 'critical'];
    if (!validStatuses.includes(parsed.status)) {
      if (disciplineIndex >= 80) parsed.status = 'elite';
      else if (disciplineIndex >= 50) parsed.status = 'solid';
      else if (disciplineIndex >= 20) parsed.status = 'slipping';
      else parsed.status = 'critical';
    }

    // Save to cache
    localStorage.setItem(cacheKey, JSON.stringify({
      date: todayFormatStr,
      insight: parsed
    }));

    // Update History
    quoteHistory.push(parsed.quote);
    localStorage.setItem(historyKey, JSON.stringify(quoteHistory));

    return parsed;
  } catch (error) {
    console.error('Error generating AI Daily Brief:', error);
    return null;
  }
}

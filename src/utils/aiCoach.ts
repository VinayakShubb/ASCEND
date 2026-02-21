import type { Habit, HabitLog } from '../types';
import { calculateDisciplineIndex, calculateDailyCompletion, getStreak, calculateWeightedScore } from './calculations';
import { format, subDays } from 'date-fns';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;


async function callGroq(prompt: string, maxTokens: number): Promise<string | null> {
  if (!GROQ_API_KEY) {
    console.error('VITE_GROQ_API_KEY not set');
    return null;
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
    });

    if (response.status === 429) {
      console.warn('AI unavailable — rate limit reached. Try again later.');
      return null;
    }

    if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (e) {
    console.error('AI fetch failed:', e);
    return null;
  }
}

function getCache(key: string): any | null {
  const cached = localStorage.getItem(key);
  if (cached) {
    try {
        return JSON.parse(cached);
    } catch {
        return null; // Malformed cache
    }
  }
  return null;
}

function setCache(key: string, value: any): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// -------------------------------------------------------------------------------------------------
// FEATURE 3 — Live AI Coach (Analytics Sidebar)
// -------------------------------------------------------------------------------------------------

export interface CoachOutput {
  status: 'elite' | 'solid' | 'slipping' | 'critical';
  headline: string;
  insight: string;
  action: string;
}

export async function getCoachInsight(
  userId: string,
  habits: Habit[],
  logs: HabitLog[],
  forceRefresh: boolean = false
): Promise<CoachOutput | null> {
  const today = new Date().toDateString();
  const dateStr = today; // used for keys and checks
  const cacheKey = `ascend_ai_coach_${userId}_${dateStr}`;

  if (!forceRefresh) {
    const cached = getCache(cacheKey);
    if (cached) return cached as CoachOutput;
  }

  // Calculate user performance data
  const disciplineIndex = calculateDisciplineIndex(habits, logs);
  const todayFormatStr = format(new Date(), 'yyyy-MM-dd');
  const todayCompletionPercent = Math.round(calculateDailyCompletion(habits, logs, todayFormatStr));
  
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dayOfWeek = days[new Date().getDay()];

  // Format active habits for the prompt
  const activeHabits = habits.filter(h => !h.archived);
  
  // Guard clause to prevent generic output on 0 active habits.
  if (activeHabits.length === 0) {
      return null;
  }

  const habitDetails = activeHabits.map(h => {
    const streak = getStreak(h.id, logs, todayFormatStr);
    
    // Calculate weekly completion (last 7 days including today)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 7 days window
    
    let weeklyCompletion = 0;
    const habitLogs = logs.filter(l => l.habit_id === h.id && l.status === 'completed');
    
    for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo);
        d.setDate(d.getDate() + i);
        const checkDateStr = format(d, 'yyyy-MM-dd');
        if (habitLogs.some(l => l.date === checkDateStr)) {
            weeklyCompletion++;
        }
    }

    const completedToday = habitLogs.some(l => l.date === todayFormatStr);

    return `  • ${h.name} — ${weeklyCompletion}/7 this week, ${streak} day streak, ${completedToday ? '✓ done today' : '✗ not done today'}`;
  }).join('\n');

  const prompt = `You are the AI core of ASCEND — a strict discipline coach. Your tone adapts exactly to the user's performance.

USER PERFORMANCE DATA:
- Discipline Index: ${disciplineIndex}/100
- Today's Completion: ${todayCompletionPercent}%
- Day: ${dayOfWeek}
- Protocols:
${habitDetails}

Status thresholds and TONALITY RULES:
- elite (index >= 80): Tone = Appreciating, acknowledging high performance, commanding them to maintain the elite standard.
- solid (index >= 50 and < 80): Tone = Balanced, direct. Acknowledge good work but push for more consistency.
- slipping (index >= 20 and < 50): Tone = Sharp, warning. Point out the exact failures.
- critical (index < 20): Tone = Scolding, ordering, and brutal. Do not suggest; COMMAND them to fix their failures immediately for their own improvement. 

The user's name is ${userId}. Address them by name directly. Never use the word 'operator'.
Speak directly to ${userId} in second person. Use 'you' and 'your'. Be direct like a drill sergeant. 
Use their actual habit names and actual numbers. Never write in third person. Never be passive.

Respond ONLY with this exact JSON:
{
  "status": "elite|solid|slipping|critical",
  "headline": "max 8 words, current state summary",
  "insight": "2 sentences using actual habit names, pointing out the most important pattern. If multiple protocols are failing, mention ALL of them.",
  "action": "one concrete thing to do right now, specific not vague"
}

Rules:
- Give a response that perfectly matches the Tonality Rule for their current status.
- Use actual habit names from the data, never generic references
- DO NOT mention the difficulty level (e.g. hard, medium) in your response. Just use the name.
- If a habit has 0/7 or low completion this week, call it out directly.
- The action must be specific: not "be consistent" but "complete [Habit Name] tonight before sleep" or "do [Habit Name] immediately".

No markdown. No explanation outside the JSON.
IMPORTANT: Only reference habits and data explicitly provided. Do not invent anything.`;

  const rawResponse = await callGroq(prompt, 300);
  if (!rawResponse) return null;

  const cleanJsonStr = rawResponse.replace(/```json|```/gi, '').trim();
  
  try {
    const parsed = JSON.parse(cleanJsonStr) as CoachOutput;
    
    // Force strict mathematical status to prevent AI hallucination (Bug 1)
    parsed.status = disciplineIndex >= 80 ? 'elite' : (disciplineIndex >= 50 ? 'solid' : (disciplineIndex >= 20 ? 'slipping' : 'critical'));

    setCache(cacheKey, parsed);
    return parsed;
  } catch (e) {
    console.error('AI JSON parse failed. Raw response:', rawResponse);
    return null;
  }
}

// -------------------------------------------------------------------------------------------------
// FEATURE 4 — CIPHER Analysis (Operations Sidebar Page)
// -------------------------------------------------------------------------------------------------

export interface CipherAnalysisOutput {
  status: 'elite' | 'solid' | 'slipping' | 'critical';
  operatorVerdict: string;
  timelineComments: Record<string, string>;
  executionType: string;
  personalityInsight: string;
  hallOfFame: { bestProtocol: string; bestProtocolComment: string; bestDayComment: string; };
  hallOfShame: { worstProtocol: string; worstProtocolComment: string; worstStreakComment: string; };
  lowlightsComments: { longestDeadStreak: string; worstDay: string; mostBrokenHabit: string; biggestDrop: string; };
  ceilingInsight: string;
  biggestMistakeName: string;
  biggestMistake: string;
  biggestWinName: string;
  biggestWin: string;
  orders: Array<{ rank: number; action: string; estimatedImpact: string; }>;
  analyzedAt?: string;
}

export async function getCipherAnalysis(
  userId: string,
  userCreatedAt: string | undefined,
  habits: Habit[],
  logs: HabitLog[],
  forceRefresh: boolean = false,
  isNewUser: boolean = false
): Promise<CipherAnalysisOutput | null> {
  const dateStr = new Date().toDateString();
  const cacheKey = `ascend_ai_cipher_${userId}_${dateStr}`; // New v6 key based on spec

  if (!forceRefresh) {
    const cached = getCache(cacheKey);
    if (cached) return cached as CipherAnalysisOutput;
  }

  const activeHabits = habits.filter(h => !h.archived);
  if (activeHabits.length === 0) return null;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const disciplineIndex = calculateDisciplineIndex(habits, logs);
  
  const userRegistrationRaw = userCreatedAt ? new Date(userCreatedAt) : new Date();
  const userRegistrationDate = format(userRegistrationRaw, 'yyyy-MM-dd');
  const userDate = new Date(userRegistrationDate);
  const today = new Date();
  userDate.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  const diffTime = Math.abs(today.getTime() - userDate.getTime());
  const daysSinceRegistration = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

  // Per-habit stats & string formatting
  const habitPerformances = activeHabits.map(h => {
    const hLogs = logs.filter(l => l.habit_id === h.id && l.status === 'completed');
    const validDays = Math.min(30, daysSinceRegistration);
    const completions30d = hLogs.filter(l => {
      const d = new Date(l.date);
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
      return d >= cutoff;
    }).length;
    const rate30d = validDays > 0 ? Math.round((completions30d / validDays) * 100) : 0;
    const streak = getStreak(h.id, logs, todayStr);
    
    // Day pattern logic for execution types
    const easyHabit = h.difficulty === 'easy';
    const hardHabit = h.difficulty === 'hard' || h.difficulty === 'extreme';

    return { 
        id: h.id, name: h.name, difficulty: h.difficulty, category: h.category,
        rate30d, completions30d, validDays, streak, totalCompletions: hLogs.length,
        isEasy: easyHabit, isHard: hardHabit
    };
  });

  const habitDetailsObj = habitPerformances.map(h => 
    `  • ${h.name} [${h.difficulty}] [${h.category}]
       30D: ${h.rate30d}% (${h.completions30d}/${h.validDays} days)
       Streak: ${h.streak} days | Total completions ever: ${h.totalCompletions}`
  ).join('\\n');

  // Daily scores history (registration to today, max 100 days to save tokens)
  const maxDaysToAnalyze = Math.min(100, daysSinceRegistration);
  const dailyScores = [];
  let bestDayObj = { date: '', score: -1 };
  let longestDeadStreak = 0;
  let currentDeadStreak = 0;
  let biggestDrop = 0;
  
  // Also needed for Execution Detection:
  let daysAt100 = 0;
  let daysAt0 = 0;
  let daysAbove70 = 0;
  const deadStreakStarts: string[] = []; // Track when dead streaks start
  let missedPairsCount = 0; // "Comeback kid" logic requires finding 2+ missed days followed by 1 completed
  
  let firstHalfSum = 0;
  let secondHalfSum = 0;

  const weekendPcts = [];
  const weekdayPcts = [];

  let lastScore = -1;

  for (let i = maxDaysToAnalyze - 1; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const dateStrCheck = format(d, 'yyyy-MM-dd');
    const score = Math.round(calculateWeightedScore(habits, logs, dateStrCheck));
    const rawPct = Math.round(calculateDailyCompletion(habits, logs, dateStrCheck));
    dailyScores.push({ date: dateStrCheck, score, pct: rawPct });

    // Track best day
    if (score > bestDayObj.score) bestDayObj = { date: dateStrCheck, score };

    // Track streaks
    if (score === 0) {
        if (currentDeadStreak === 0) deadStreakStarts.push(dateStrCheck); // Record the start
        currentDeadStreak++;
        if (currentDeadStreak > longestDeadStreak) longestDeadStreak = currentDeadStreak;
    } else {
        if (currentDeadStreak >= 2) missedPairsCount++;
        currentDeadStreak = 0;
    }

    // Track biggest drop
    if (lastScore !== -1) {
        const drop = lastScore - score;
        if (drop > biggestDrop) biggestDrop = drop;
    }
    lastScore = score;

    // Track for execution types
    if (rawPct === 100) daysAt100++;
    if (rawPct === 0) daysAt0++;
    if (rawPct >= 70) daysAbove70++;

    // Half sums
    const halfMark = Math.floor(maxDaysToAnalyze / 2);
    if (i >= halfMark) firstHalfSum += score;
    else secondHalfSum += score;

    // Weekend vs Weekday
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) weekendPcts.push(rawPct);
    else weekdayPcts.push(rawPct);
  }

  // Execution Detection Logic
  const totalAnalyzed = dailyScores.length;
  let detectedType = "CONSISTENT BUILDER"; // Default fallback
  
  const avgFirstHalf = firstHalfSum / Math.max(1, Math.floor(maxDaysToAnalyze/2));
  const avgSecondHalf = secondHalfSum / Math.max(1, Math.ceil(maxDaysToAnalyze/2));
  
  const avgWeekend = weekendPcts.length ? weekendPcts.reduce((a,b)=>a+b,0)/weekendPcts.length : 0;
  const avgWeekday = weekdayPcts.length ? weekdayPcts.reduce((a,b)=>a+b,0)/weekdayPcts.length : 0;

  const easyHabits = habitPerformances.filter(h => h.isEasy);
  const avgEasy = easyHabits.length ? easyHabits.reduce((a,h)=>a+h.rate30d,0)/easyHabits.length : 0;
  const hardHabits = habitPerformances.filter(h => h.isHard);
  const avgHard = hardHabits.length ? hardHabits.reduce((a,h)=>a+h.rate30d,0)/hardHabits.length : 0;

  // 1: BURST EXECUTOR
  if (daysAbove70 > 0 && (daysAt0 / totalAnalyzed) > 0.5) detectedType = "BURST EXECUTOR";
  // 5: ALL OR NOTHING
  else if ((daysAt100 + daysAt0) / totalAnalyzed > 0.6) detectedType = "ALL OR NOTHING";
  // 7: GHOST MODE
  else if ((totalAnalyzed - daysAt0) / totalAnalyzed < 0.2) detectedType = "GHOST MODE";
  // 10: SELECTIVE EXECUTOR
  else if (avgEasy > 60 && avgHard < 30) detectedType = "SELECTIVE EXECUTOR";
  // 4: WEEKEND WARRIOR
  else if (Math.abs(avgWeekend - avgWeekday) > 20) detectedType = "WEEKEND WARRIOR";
  // 6: DECLINING PERFORMER
  else if (avgFirstHalf > avgSecondHalf + 10 && maxDaysToAnalyze >= 7) detectedType = "DECLINING PERFORMER";
  // 3: SLOW STARTER
  else if (avgSecondHalf > avgFirstHalf + 10 && maxDaysToAnalyze >= 7) detectedType = "SLOW STARTER";
  // 9: COMEBACK KID
  else if (missedPairsCount >= 3) detectedType = "COMEBACK KID";
  // 8: EARLY QUITTER
  else if (totalAnalyzed >= 7) {
     const monTue = dailyScores.filter(d => { const day = new Date(d.date).getDay(); return day===1 || day===2; }).map(d=>d.pct);
     const others = dailyScores.filter(d => { const day = new Date(d.date).getDay(); return day>2 || day===0; }).map(d=>d.pct);
     const avgMonTue = monTue.length ? monTue.reduce((a,b)=>a+b,0)/monTue.length : 0;
     const avgOthers = others.length ? others.reduce((a,b)=>a+b,0)/others.length : 0;
     if (avgMonTue > avgOthers + 25) detectedType = "EARLY QUITTER";
  }

  // Best/worst habits
  const sortedHabits = [...habitPerformances].sort((a,b) => b.rate30d - a.rate30d);
  const bestHabit = sortedHabits[0];
  const worstHabit = sortedHabits[sortedHabits.length - 1];

  const dailyScoresStr = dailyScores.map(d => `${d.date}: ${d.score}/100`).join('\n');

  // Timeline anchors
  const deadStreakStartStr = deadStreakStarts.length > 0 ? deadStreakStarts[deadStreakStarts.length - 1] : "";

  const newUserPersonality = `SPECIAL MODE: NEW USER GRACE PERIOD

${userId} registered only ${daysSinceRegistration} days ago. This is their onboarding phase.

YOUR PERSONALITY FOR NEW USERS:
- You are ENCOURAGING, not brutal
- You are a TEACHER, not a judge
- Focus on BUILDING THE HABIT of daily tracking, not performance
- Celebrate small wins: "You logged protocols 2 days in a row — that's momentum"
- If they missed a day: "That's okay. The system is new. Just open the app again today."
- NO harsh language. NO confrontation. NO disappointment.
- Explain what the Discipline Index means and how it grows over time
- Tell them: "After day 3, CIPHER becomes more direct. For now, focus on consistency."

RULES:
- Never call them "dismal" or "critical" or "slipping"
- Never use red flag language like "concerning" or "failure"
- Frame everything as learning: "You're figuring out your rhythm"
- Remind them the real analysis starts after day 3`;

  const veteranPersonality = `You are a brutal, honest performance coach. You appreciate genuine good work.
You call out failure directly. You never sugarcoat. You never use passive voice.`;

  const prompt = `You are CIPHER — the AI core of ASCEND, a personal discipline operating system.
${isNewUser ? newUserPersonality : veteranPersonality}

USER: ${userId}
Registration: ${userRegistrationDate} (${daysSinceRegistration} days ago)
Discipline Index: ${disciplineIndex}/100
Execution Type Detected: ${detectedType}

PROTOCOL DATA:
${habitDetailsObj}

DAILY HISTORY (registration to today):
${dailyScoresStr}

KEY COMPUTED STATS:
- Best habit: ${bestHabit.name} at ${bestHabit.rate30d}%
- Worst habit: ${worstHabit.name} at ${worstHabit.rate30d}%
- Best day: ${bestDayObj.date} with ${bestDayObj.score} points
- Longest dead streak: ${longestDeadStreak} consecutive days at zero
- Biggest single drop: -${biggestDrop} points in 24 hours
- Total habits: ${activeHabits.length}
- Timeline Anchors available: "${userRegistrationDate}", "${bestDayObj.date}", "${deadStreakStartStr}", "today"

RULES — CRITICAL:
- Always address ${userId} directly. Use "you" and "your". Never "the user" or "operator".
- Start operatorVerdict with "${userId},"
- Never write habit names with brackets like [hard] — write naturally.
- Reference specific dates, percentages, habit names from the data above.
${isNewUser ? '- Be encouraging and patient. This is a new user learning the system.' : '- Be a coach: brutal when performance is bad, genuinely appreciative when it is good.'}
- Every order must be executable TONIGHT, not someday.
- Do not repeat the same advice across multiple sections.
- If data is sparse (under 5 days), acknowledge it directly and give what you can.
- DO NOT ONLY TALK ABOUT THE DISCIPLINE INDEX. Reference completion rates, streaks, specific habit performance, behavioral patterns, consistency, and trends. The DI is just one metric — you have access to completion percentages, streaks, daily scores, best/worst habits, and more. Use ALL of them.
- When mentioning numbers, ONLY use exact numbers from the data provided. NEVER invent or round numbers that aren't in the data.

Respond ONLY with this exact JSON. No markdown. No text outside the JSON:

{
  "status": "${isNewUser ? 'solid' : 'elite|solid|slipping|critical'}",
  "operatorVerdict": "${isNewUser ? `2-3 sentences. Start with ${userId}. Encouraging welcome message. Mention they are in the learning phase. Reference their habit setup and early progress. Tell them CIPHER becomes more direct after day 3.` : `2-3 sentences. Start with ${userId}. Overall honest assessment using completion rates, streaks, and habit-specific data — not just the index number. Reference their actual habit performance.`}",
  "timelineComments": {
    "${userRegistrationDate}": "${isNewUser ? 'one encouraging line about starting their journey' : 'one line CIPHER comment on day one'}",
    "${bestDayObj.date}": "${isNewUser ? 'one line celebrating their best effort so far' : 'one line on their best day'}",
    ${deadStreakStartStr ? `"${deadStreakStartStr}": "${isNewUser ? 'one gentle line — missed days are normal when starting out' : 'one line on when the dead streak began'}",` : ''}
    "today": "one line about today's ${disciplineIndex}/100 index — use EXACTLY this number, do not change it${isNewUser ? '. Be encouraging.' : ''}"
  },
  "executionType": "${detectedType}",
  "personalityInsight": "${isNewUser ? `2-3 sentences. Talk DIRECTLY to ${userId}. Explain their execution type in an encouraging, educational way. Frame it as 'here is how you naturally work' not a judgment.` : `2-3 sentences. Talk DIRECTLY to ${userId} using 'you' and 'your'. NEVER use third-person like '${userId} tends to...'. Explain why they are this type using their specific numbers. Be direct.`}",
  "hallOfFame": {
    "bestProtocol": "${bestHabit.name}",
    "bestProtocolComment": "${isNewUser ? 'Talk DIRECTLY to them. 1 sentence celebrating this early effort.' : 'Talk DIRECTLY to them. 1 sentence genuine acknowledgment.'}",
    "bestDayComment": "${isNewUser ? 'Talk DIRECTLY to them. 1 sentence about their progress so far.' : 'Talk DIRECTLY to them. 1 sentence about their best day ever.'}"
  },
  "hallOfShame": {
    "worstProtocol": "${worstHabit.name}",
    "worstProtocolComment": "${isNewUser ? 'Talk DIRECTLY to them. 1 gentle sentence. Frame as an area to explore, not a failure.' : 'Talk DIRECTLY to them. 1 brutal fair sentence.'}",
    "worstStreakComment": "${isNewUser ? 'Talk DIRECTLY to them. 1 sentence normalizing missed days for new users.' : `Talk DIRECTLY to them. 1 sentence about their ${longestDeadStreak}-day dead streak.`}"
  },
  "lowlightsComments": {
    "longestDeadStreak": "${isNewUser ? '1 encouraging sentence. Missed days are normal early on. Give a gentle tip.' : '1 sentence CIPHER reaction PLUS specific actionable advice on how to prevent this.'}",
    "worstDay": "${isNewUser ? '1 encouraging sentence. Frame as learning, give a simple tip.' : '1 sentence CIPHER reaction PLUS specific actionable advice on how to improve.'}",
    "mostBrokenHabit": "${isNewUser ? '1 encouraging sentence about building this habit gradually.' : '1 sentence CIPHER reaction PLUS specific actionable advice to fix this habit.'}",
    "biggestDrop": "${isNewUser ? '1 encouraging sentence. Fluctuations are normal at the start.' : '1 sentence CIPHER reaction PLUS specific actionable advice to stabilize.'}"
  },
  "ceilingInsight": "${isNewUser ? `Talk DIRECTLY to them. 2 sentences. Explain what the ceiling means and how it will grow as they build consistency. Be encouraging.` : 'Talk DIRECTLY to them. 2 sentences. What is your ceiling with current protocols? Can you hit 100? What would it take?'}",
  "biggestMistakeName": "${isNewUser ? 'focus area or habit name' : 'habit name or short pattern label'}",
  "biggestMistake": "${isNewUser ? `2-3 sentences. Frame as a focus area, not a mistake. Talk DIRECTLY to ${userId}. Suggest how to approach this area. Be encouraging.` : `3-4 sentences. The single most damaging thing ${userId} is doing or not doing. Talk DIRECTLY to them. Confrontational but fair. Real numbers.`}",
  "biggestWinName": "habit name or pattern label",
  "biggestWin": "${isNewUser ? `2-3 sentences. Celebrate their early effort. Talk DIRECTLY to ${userId}. Motivate them to keep exploring the system.` : `3-4 sentences. Genuine appreciation for their best effort or consistency. Talk DIRECTLY to them to motivate them to keep it up.`}",
  "orders": [
    { "rank": 1, "action": "${isNewUser ? 'Gentle suggestion for tonight. Frame as exploration, not demand.' : 'Specific executable action tonight. Not vague.'}", "estimatedImpact": "${isNewUser ? 'building momentum' : '+~X index points'}" },
    { "rank": 2, "action": "${isNewUser ? 'Second gentle suggestion to help them learn the system.' : 'Second specific action.'}", "estimatedImpact": "${isNewUser ? 'learning the system' : '+~Y index points'}" },
    { "rank": 3, "action": "${isNewUser ? 'Third gentle suggestion — focus on opening the app daily.' : 'Third specific action.'}", "estimatedImpact": "${isNewUser ? 'building the habit' : '+~Z index points'}" }
  ]
}

Only reference data provided above. Do not invent events, dates, or patterns.
`;

  const rawResponse = await callGroq(prompt, 1800);
  if (!rawResponse) return null;

  const cleanJsonStr = rawResponse.replace(/```json|```/gi, '').trim();
  
  try {
    const parsed = JSON.parse(cleanJsonStr) as CipherAnalysisOutput;
    if (!parsed || !parsed.status || !parsed.orders) throw new Error('Malformed AI Output');
    parsed.status = isNewUser
      ? (disciplineIndex >= 70 ? 'elite' : 'solid')
      : (disciplineIndex >= 80 ? 'elite' : (disciplineIndex >= 50 ? 'solid' : (disciplineIndex >= 20 ? 'slipping' : 'critical')));
    parsed.analyzedAt = new Date().toISOString();
    setCache(cacheKey, parsed);
    return parsed;
  } catch (e) {
    console.error('CIPHER JSON parse failed. Raw response:', rawResponse);
    return null;
  }
}

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({path: './ascend/.env'});

const calculateWeightedScore = (habits, logs, dateStr) => {
  const activeHabits = habits.filter(h => !h.archived);
  let potentialScore = 0;
  let earnedScore = 0;
  
  const logsForDate = logs.filter(l => l.date === dateStr && l.status === 'completed');
  
  activeHabits.forEach(habit => {
    const diff = habit.difficulty || 'medium';
    const multiplier = diff === 'easy' ? 0.5 : diff === 'medium' ? 1.0 : diff === 'hard' ? 1.5 : 2.0;
    potentialScore += multiplier;
    if (logsForDate.some(l => l.habit_id === habit.id)) {
      earnedScore += multiplier;
    }
  });
  
  if (potentialScore === 0) return 0;
  return (earnedScore / potentialScore) * 100;
};

const subDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

const format = (date) => {
  const local = new Date(date);
  local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return local.toISOString().split('T')[0];
};

const calculateDisciplineIndex = (habits, logs, endDate = format(new Date())) => {
  let totalScore = 0;
  const days = 7;
  for (let i = 0; i < days; i++) {
    const date = format(subDays(new Date(endDate), i));
    totalScore += calculateWeightedScore(habits, logs, date);
  }
  return Math.round(totalScore / days);
};

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: users } = await supabase.from('users').select('*');
  const user = users[0];
  const { data: habits } = await supabase.from('habits').select('*').eq('user_id', user.id);
  const { data: logs } = await supabase.from('habit_logs').select('*');
  
  const recentLogs = logs.filter(l => habits.find(h => h.id === l.habit_id));
  
  const di = calculateDisciplineIndex(habits, recentLogs);
  console.log(`Calculated DI: ${di}`);
  
  const today = new Date();
  for(let i=0; i<7; i++) {
     const d = format(subDays(today, i));
     console.log(`${d}: ${calculateWeightedScore(habits, recentLogs, d)}`);
  }
}
run();

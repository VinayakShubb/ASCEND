import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { calculateDisciplineIndex } from './src/utils/calculations';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function run() {
  const { data: users } = await supabase.from('users').select('*').eq('username', 'ShubV').single();
  const userId = users.id;

  const { data: habits } = await supabase.from('habits').select('*').eq('user_id', userId);
  const { data: logs } = await supabase.from('habit_logs').select('*').eq('user_id', userId);

  console.log("Found habits:", habits.length);
  console.log("Found logs:", logs.length);

  const di = calculateDisciplineIndex(habits, logs);
  console.log("CALCULATED DI SERVER SIDE:", di);
}

run();

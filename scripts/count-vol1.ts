import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const vol1Chapters = [
  'Units and Measurements',
  'Nature of Physical World and Measurement',
  'Kinematics',
  'Motion in a Straight Line',
  'Motion in a Plane',
  'Laws of Motion',
  'Work, Energy and Power',
  'System of Particles and Rotational Motion',
  'Rotational Motion',
];

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data, error } = await supabase
    .from('questions')
    .select('chapter')
    .eq('subject', 'Physics')
    .eq('tamil_status', 'none')
    .in('chapter', vol1Chapters);

  if (error) { console.error(error); process.exit(1); }

  const counts: Record<string, number> = {};
  for (const q of data!) counts[q.chapter] = (counts[q.chapter] || 0) + 1;

  let total = 0;
  for (const [ch, n] of Object.entries(counts).sort()) {
    console.log(`  ${ch}: ${n}`);
    total += n;
  }
  console.log(`\nTotal: ${total}`);
  console.log(`Batches of 5: ${Math.ceil(total / 5)}`);
}

main();

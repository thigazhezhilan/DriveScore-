import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data, error } = await supabase
    .from('questions')
    .select('id, subject, chapter, text, tamil_question_text, tamil_options, tamil_status')
    .eq('subject', 'Physics')
    .neq('tamil_status', 'none')
    .order('tamil_drafted_at', { ascending: false })
    .limit(5);

  if (error) { console.error(error); process.exit(1); }

  for (const q of data!) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Chapter : ${q.chapter}`);
    console.log(`Status  : ${q.tamil_status}`);
    console.log(`English : ${q.text}`);
    console.log(`Tamil   : ${q.tamil_question_text}`);
    if (q.tamil_options) {
      (q.tamil_options as string[]).forEach((o, i) => console.log(`  ${String.fromCharCode(65+i)}. ${o}`));
    }
  }

  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .neq('tamil_status', 'none');

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Total translated so far: ${count}`);
}

main();

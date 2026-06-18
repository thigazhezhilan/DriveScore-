import { readFileSync } from 'fs';
const q = JSON.parse(readFileSync('.translation-queue.json', 'utf-8'));
for (const item of q.items) {
  console.log(`\n[${q.items.indexOf(item)+1}] ${item.questionId}`);
  console.log(`Chapter: ${item.chapter} | Difficulty: ${item.difficulty ?? '?'}`);
  console.log(`Q: ${item.question_text}`);
  item.options.forEach((o: string, i: number) => console.log(`   ${String.fromCharCode(65+i)}. ${o}`));
}

# Mutating e2e flows — opt-in only

These specs **write to the database** (create questions, students, centres,
teachers; submit mock attempts). They are **skipped by default** so they never
pollute the live demo Supabase that's shown to centres.

## To run them

Point the app at a **throwaway/seeded test database** (not the production demo
project), then:

```bash
RUN_MUTATING=1 npx playwright test e2e/mutating
```

On Windows PowerShell:

```powershell
$env:RUN_MUTATING = "1"; npx playwright test e2e/mutating
```

## Why gated

The admin dashboard KPIs (centres, students, mocks taken) are computed from
real rows. Running create-centre / create-teacher / add-student / take-a-mock
against the production project inflates those numbers and leaves orphaned demo
data. Use a disposable Supabase project (run migrations + `npm run db:seed`)
for these.

## Coverage status

- `teacher-add-question.spec.ts` — fully wired template (add a question, assert
  it lands in the bank). Use it as the pattern for the rest.
- Remaining flows (CSV import w/ bad rows, build+publish a mock, add a student,
  create centre+teacher, full student mock→report loop) are listed as a manual
  checklist in `QA-REPORT.md` and should be ported here against the test DB.

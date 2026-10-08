# FitForge — Forge your best self

AI-powered fitness app: personalized workout plans (home or gym), AI diet plans, a live workout tracker, meal/water/weight tracking, progress charts and an AI coach chat.

**Stack:** Next.js 16 (App Router) · Tailwind CSS v4 · Supabase (Auth, Postgres + RLS, Storage) · Claude API (Sonnet 5.5 for plans & coach, Haiku 4.5 for quick estimates) · Recharts

## Setup

### 1. Install
```bash
npm install
```

### 2. Create a Supabase project
1. Create a free project at [supabase.com](https://supabase.com).
2. Apply the database migrations in [`supabase/migrations/`](supabase/migrations/), either:
   - **CLI:** `npx supabase login`, `npx supabase link --project-ref <ref>` (asks for the database password), then `npx supabase db push`; or
   - **SQL Editor:** paste and run each file in order — `0001_init.sql`, `0002_progress_photos.sql`, `0003_full_persistence.sql`.
3. **Authentication → URL Configuration:** set Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs.
4. *(Optional, faster local testing)* **Authentication → Providers → Email:** turn off "Confirm email".
5. *(Optional)* **Authentication → Providers → Google:** enable it to use "Continue with Google".

### 3. Environment variables
```bash
cp .env.local.example .env.local
```
Fill in your Supabase URL, anon key and service-role key (Project Settings → API), and your Anthropic API key ([console.anthropic.com](https://console.anthropic.com)).

### 4. Seed the exercise library (~870 exercises with images)
```bash
npm run seed:exercises
```
Source: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain).

### 5. Run
```bash
npm run dev
```
Open http://localhost:3000.

## Scripts
| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm test` | Unit tests (health calculations) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run seed:exercises` | Load the exercise library into Supabase |

## How it fits together
- **Health math is deterministic** (`lib/fitness/calculations.ts`): BMI, Mifflin–St Jeor BMR, TDEE, calorie target, macros, water. The AI receives these numbers — it never invents them.
- **Workout plans** (`lib/ai/plans.ts`): the exercise library is filtered by the user's location, equipment and level; Claude may only pick exercise ids from that list, and output is validated with Zod.
- **AI coach** (`app/api/ai/chat/route.ts`, `lib/ai/coach.ts`): streams replies, knows the user's profile/plan/logs, and can *propose* plan changes, meal swaps or meal logs that the user applies with one tap.
- **Security:** every user table has Row Level Security; API keys stay server-side; daily AI quotas per user (`consume_ai_quota` SQL function).

## Deploy
Push to GitHub and import into [Vercel](https://vercel.com). Add the same env vars (set `NEXT_PUBLIC_SITE_URL` to your production URL) and add `https://your-domain/auth/callback` to Supabase Redirect URLs.

> FitForge provides general fitness guidance, not medical advice.

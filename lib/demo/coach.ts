import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoredWorkoutPlan } from "@/lib/ai/schemas";
import { getActiveDietPlan, getActiveWorkoutPlan, pickTodaysWorkout } from "@/lib/data/plans";
import { getMealsBetween, getRecentSessions, getWaterFor, sumMeals } from "@/lib/data/stats";
import { shiftKey, todayKey, userTimeZone, weekdayOf } from "@/lib/date";
import { GOALS, labelFor } from "@/lib/fitness/options";
import type { ChatProposal, MealType, Profile } from "@/lib/types";
import { estimateMeal } from "./ai";
import { EXERCISES } from "./seed";

/**
 * Rule-based stand-in for the AI coach in demo mode. It reads the user's real
 * (demo) data so answers are specific, matches topics by word stems so typos
 * still land, and can combine two topics in one reply.
 */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const r0 = (n: number) => Math.round(n);
const r1 = (n: number) => Math.round(n * 10) / 10;

async function loadContext(supabase: SupabaseClient, profile: Profile) {
  const tz = await userTimeZone();
  const today = await todayKey();
  const [plan, diet, meals, water, sessions, { data: weights }, { data: sets }] = await Promise.all([
    getActiveWorkoutPlan(supabase, profile.id),
    getActiveDietPlan(supabase, profile.id),
    getMealsBetween(supabase, profile.id, today, today),
    getWaterFor(supabase, profile.id, today),
    getRecentSessions(supabase, profile.id, tz, shiftKey(today, -6)),
    supabase.from("body_metrics").select("log_date, weight_kg").eq("user_id", profile.id).not("weight_kg", "is", null).order("log_date"),
    supabase.from("session_sets").select("exercise_name, reps, weight_kg").eq("user_id", profile.id).gt("weight_kg", 0),
  ]);

  const best = new Map<string, { weight: number; reps: number }>();
  for (const s of sets ?? []) {
    const w = Number(s.weight_kg);
    if (w > (best.get(s.exercise_name)?.weight ?? 0)) best.set(s.exercise_name, { weight: w, reps: s.reps ?? 0 });
  }

  return {
    today,
    plan: plan?.plan ?? null,
    diet: diet?.plan ?? null,
    eaten: sumMeals(meals),
    water,
    sessions,
    weights: (weights ?? []).map((w) => ({ date: w.log_date as string, kg: Number(w.weight_kg) })),
    best,
  };
}

type Ctx = Awaited<ReturnType<typeof loadContext>> & { p: Profile; name: string };

// ───────────────────────── topics ─────────────────────────

// Order matters: earlier topics win when a message matches several.
const TOPICS: [topic: string, pattern: RegExp][] = [
  ["pain", /\b(pain|hurt|injur|ache|aching|sprain|strain)|(knee|shoulder|back|wrist|elbow|hip) (pain|hurt)/],
  ["name", /\bmy name\b|who am i|what.{0,10}call me|do you know me/],
  ["thanks", /^(thanks|thank you|thx|ty|cheers|appreciate)/],
  ["greeting", /^(hi|hey|hello|yo|sup|hola|good (morning|afternoon|evening))\b/],
  ["today_workout", /(today|tonight|now).{0,25}(workout|train|session|gym|exercise)|what.{0,15}(train|workout|session)|next workout/],
  ["food_today", /(left|remaining|so far|today).{0,25}(calor|kcal|\beat|protein|\bfood)|how (much|many).{0,20}(\beaten|\beat|left)/],
  ["form", /how (do|to|should) (i )?(do|perform)|\bform\b|techni|cue/],
  ["plan", /(?<!(meal|diet|food) )\b(plan|program|split|routine|schedule)\b/],
  ["targets", /calor|kcal|macro|target|tdee|bmr|deficit|surplus/],
  ["protein", /prot[ei]/],
  ["water", /water|hydrat|thirst/],
  ["weight", /weigh|progress|scale|trend|\bkgs?\b|\blbs?\b/],
  ["strength", /stre?n?g?th|stren|strong|plateau|stuck|stall|bench|squat|deadlift|\bpr\b|1rm|heavier/],
  ["fat", /\bfat\b|lose|loss|lean|\bcut|shred|belly|slim|tone/],
  ["muscle", /musc|bulk|gain|size|hypertro|grow|bigger/],
  ["cardio", /cardio|\brun|endur|stamina|hiit|walk|steps|jog|cycl/],
  ["recovery", /sleep|rest day|recover|tired|fatigue|energy|sore/],
  ["motivation", /motiv|lazy|skip|consist|discipline|habit|give up|bored/],
  ["supplements", /supplement|creatine|whey|pre.?workout|vitamin|caffeine|omega/],
  ["alcohol", /alcohol|beer|wine|drunk|party/],
  ["meals", /\bmeal|\beat|\bfood|\bdiet|recipe|breakfast|lunch|dinner|snack|hungry|craving|\bcook/],
];

function detectTopics(message: string): string[] {
  const m = message.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
  return TOPICS.filter(([, re]) => re.test(m)).map(([t]) => t);
}

// ───────────────────────── answers ─────────────────────────

function planDays(plan: StoredWorkoutPlan) {
  return plan.days.map((d) => `- **${d.weekday}:** ${d.name}`).join("\n");
}

/** Best sets, main lifts (each plan day's opener) first. */
function topLifts(c: Ctx, n = 2) {
  const main = new Set(c.plan?.days.map((d) => d.exercises[0]?.name) ?? []);
  return [...c.best.entries()]
    .sort((a, b) => Number(main.has(b[0])) - Number(main.has(a[0])) || b[1].weight - a[1].weight)
    .slice(0, n)
    .map(([name, b]) => `${name} ${b.weight} kg × ${b.reps}`);
}

function proteinFoods(p: Profile) {
  if (p.diet_type === "vegan") return "tofu, tempeh, lentils, chickpeas, soy milk or a vegan protein shake";
  if (p.diet_type === "vegetarian") return "Greek yogurt, paneer, lentils, tofu, cottage cheese or a whey shake";
  if (p.diet_type === "eggetarian") return "eggs, Greek yogurt, paneer, lentils or a whey shake";
  return "chicken, fish, eggs, Greek yogurt, lean beef or a whey shake";
}

const ANSWERS: Record<string, (c: Ctx, message: string) => string> = {
  name: (c) =>
    c.p.full_name
      ? `You're **${c.p.full_name}** — ${c.name} for short! 👋 Your goal is to **${labelFor(GOALS, c.p.goal).toLowerCase()}**` +
        (c.p.weight_kg && c.p.target_weight_kg ? `, going from ${Number(c.p.weight_kg)} kg towards ${Number(c.p.target_weight_kg)} kg.` : ".")
      : "I don't have your name yet — you can add it on your Profile page.",

  greeting: (c) => {
    const pick = c.plan ? pickTodaysWorkout(c.plan, weekdayOf(c.today)) : null;
    const line = pick?.isToday ? `Today is **${pick.day.name}** day.` : pick ? `Rest day today — next up is **${pick.day.name}** on ${pick.weekday}.` : "";
    return `Hey ${c.name}! ${line} What can I help with — training, food or recovery?`;
  },

  thanks: (c) => `Anytime, ${c.name}! Keep logging and I'll keep the advice specific. 💪`,

  today_workout: (c) => {
    if (!c.plan) return `You don't have a workout plan yet, ${c.name}. Head to **Workouts** and tap Generate — I'll build one around your ${c.p.days_per_week ?? 3}-day schedule.`;
    const pick = pickTodaysWorkout(c.plan, weekdayOf(c.today));
    if (!pick) return "Your plan doesn't have any training days yet.";
    const list = pick.day.exercises.slice(0, 6).map((e) => `- ${e.name} — ${e.sets}×${e.reps}`).join("\n");
    return pick.isToday
      ? `Today is **${pick.day.name}** (${pick.day.focus.toLowerCase()}), about ${pick.day.estimated_minutes} min:\n\n${list}\n\nWarm up first: ${pick.day.warmup.toLowerCase()}.`
      : `Today's a rest day, ${c.name}. Your next session is **${pick.day.name}** on ${pick.weekday}:\n\n${list}\n\nA 20-30 minute walk and some mobility work today will help you recover.`;
  },

  plan: (c) =>
    c.plan
      ? `You're on **${c.plan.title}** (${c.plan.split}), ${c.plan.days.length} days a week:\n\n${planDays(c.plan)}\n\n**How to progress:** ${c.plan.progression[0]}`
      : `You don't have a plan yet — generate one on the **Workouts** page and I'll tailor it to your goal to ${labelFor(GOALS, c.p.goal).toLowerCase()}.`,

  food_today: (c) => {
    const target = c.p.calorie_target ?? 2000;
    const pTarget = c.p.protein_g ?? 120;
    const left = target - c.eaten.calories;
    const pLeft = pTarget - c.eaten.protein_g;
    return (
      `So far today: **${r0(c.eaten.calories)} of ${target} kcal** and **${r0(c.eaten.protein_g)} of ${pTarget} g protein**.\n\n` +
      (left > 0
        ? `That leaves about ${r0(left)} kcal and ${r0(Math.max(0, pLeft))} g protein. ` +
          (pLeft > 40 ? `Make protein the focus of your next meal — ${proteinFoods(c.p)}.` : "You're on track — keep the next meal balanced.")
        : `You're ${r0(-left)} kcal over target today. No stress — one day doesn't change your trend. Keep tomorrow on plan.`)
    );
  },

  targets: (c) =>
    c.p.calorie_target
      ? `Your daily targets are **${c.p.calorie_target} kcal**, ${c.p.protein_g} g protein, ${c.p.carbs_g} g carbs and ${c.p.fat_g} g fat, plus ${c.p.water_ml} ml of water.\n\nThat comes from a maintenance level (TDEE) of about ${c.p.tdee} kcal, adjusted for your goal to ${labelFor(GOALS, c.p.goal).toLowerCase()}.`
      : "Finish onboarding and I'll calculate your calorie and macro targets.",

  protein: (c) => {
    const pt = c.p.protein_g ?? 120;
    const meals = c.p.meals_per_day ?? 4;
    return `Your protein target is **${pt} g a day** — roughly ${r0(pt / meals)} g in each of your ${meals} meals. Today you're at ${r0(c.eaten.protein_g)} g.\n\nEasy wins for you: ${proteinFoods(c.p)}.`;
  },

  water: (c) => {
    const target = c.p.water_ml ?? 2500;
    const left = target - c.water;
    return left > 0
      ? `You've had **${c.water} ml** of water today out of ${target} ml — about ${Math.ceil(left / 250)} more glasses to go. Keeping a bottle where you can see it is the easiest trick.`
      : `You've had ${c.water} ml today — target hit! 💧 Add a little extra on training days or when it's hot.`;
  },

  weight: (c) => {
    if (c.weights.length < 2) return `Log your weight on the **Progress** page a few mornings a week, ${c.name}, and I'll show you the trend.`;
    const first = c.weights[0];
    const last = c.weights.at(-1)!;
    const weeks = Math.max(1, (Date.parse(last.date) - Date.parse(first.date)) / (7 * 86_400_000));
    const delta = r1(last.kg - first.kg);
    const rate = r1(delta / weeks);
    const goal = c.p.target_weight_kg ? Number(c.p.target_weight_kg) : null;
    const toGo = goal !== null ? r1(Math.abs(last.kg - goal)) : null;
    return (
      `You've gone from **${first.kg} kg to ${last.kg} kg** (${delta > 0 ? "+" : ""}${delta} kg) over ${r0(weeks)} weeks — about ${Math.abs(rate)} kg a week.` +
      (toGo && rate !== 0 ? `\n\nThat's ${toGo} kg to your ${goal} kg goal, roughly **${Math.ceil(toGo / Math.abs(rate))} more weeks** at this pace.` : "") +
      (Math.abs(rate) > 1 ? " That's on the fast side — consider eating a little more to protect your muscle." : " That's a healthy, sustainable pace. 👏")
    );
  },

  strength: (c) => {
    const lifts = topLifts(c);
    return (
      `To get stronger, ${c.name}, focus on getting a little better on your main lifts every week:\n\n` +
      `- **Add reps, then weight:** once every set hits the top of the rep range, add 2.5 kg.\n` +
      `- **Rest properly:** 2-3 minutes between heavy sets.\n` +
      `- **Keep 1-2 reps in reserve** so you can train hard again next session.` +
      (lifts.length ? `\n\nYour best recent sets: ${lifts.join(", ")}. Let's beat those.` : "")
    );
  },

  fat: (c) =>
    `For fat loss, the big three are:\n\n` +
    `- **A steady calorie deficit:** your target is ${c.p.calorie_target ?? "—"} kcal a day.\n` +
    `- **High protein** (${c.p.protein_g ?? "—"} g) so the weight you lose is fat, not muscle.\n` +
    `- **Daily movement:** 8-10k steps burns more over a week than most cardio sessions.\n\n` +
    `Aim to lose about 0.5-1% of your bodyweight a week.`,

  recomp: (c) => {
    const lifts = topLifts(c, 1);
    return (
      `Getting stronger *and* losing fat at the same time is very doable, ${c.name}${c.p.training_months ? ` — especially at ${c.p.training_months} months of training` : ""}. The recipe:\n\n` +
      `- **Small deficit, not a crash diet:** stick close to ${c.p.calorie_target ?? "your"} kcal so you still have energy to lift.\n` +
      `- **Protein every meal:** ${c.p.protein_g ?? 120} g a day protects muscle.\n` +
      `- **Keep lifting heavy:** your strength days are what tell your body to keep muscle${lifts.length ? ` (current best: ${lifts[0]})` : ""}.\n` +
      `- **Walk more** instead of adding long cardio sessions.\n\n` +
      `If your lifts hold steady while the scale goes down, it's working.`
    );
  },

  muscle: (c) =>
    `To build muscle, ${c.name}: train each muscle about twice a week with 10-20 hard sets, eat ${c.p.protein_g ?? 120} g protein a day, and add weight or reps over time.` +
    (c.p.goal === "lose_fat" ? ` Since you're cutting right now, expect slow gains — holding your strength is already a win.` : ` A small calorie surplus (200-300 kcal) speeds things up.`),

  cardio: (c) =>
    `${c.sessions.length} workouts in the last 7 days — nice. For cardio, mix **easy steady sessions** (you can still talk, 20-40 min) with **one harder interval session** a week. Keep the hard one away from your leg days so it doesn't hurt your lifting.`,

  recovery: (c) =>
    `Recovery is where progress happens, ${c.name}. Aim for **7-9 hours of sleep**, keep at least one full rest day a week, and if you feel run down, drop one set per exercise rather than skipping the session. You've trained ${c.sessions.length} times this week, so listen to your body.`,

  motivation: (c) =>
    `Motivation comes and goes — **systems** keep you going. You've already done ${c.sessions.length} workout${c.sessions.length === 1 ? "" : "s"} this week. Schedule the next one like a meeting, pack your bag the night before, and on low days just commit to the warm-up. You'll almost always finish once you start.`,

  supplements: () =>
    `Most people don't need much: **creatine monohydrate** (3-5 g daily) is the best-researched, **whey or plant protein** helps you hit your protein target, and **vitamin D** is worth it if you get little sun. Food, sleep and training matter far more than anything in a tub.`,

  alcohol: (c) =>
    `You don't have to cut alcohol out completely, ${c.name}. Drinks add calories without protein and hurt sleep and recovery, so keep it to 1-2 occasionally, avoid drinking the night before a hard session, and have water in between.`,

  meals: (c) =>
    c.diet
      ? `Your meal plan has:\n\n${c.diet.meals.map((m) => `- **${m.name}** (${m.meal_type}, ${m.calories} kcal, ${r0(m.protein_g)} g protein)`).join("\n")}\n\nTap the swap button on any meal in **Diet** if you want something different.`
      : `You don't have a meal plan yet — generate one on the **Diet** page. Meanwhile, build each meal around a protein (${proteinFoods(c.p)}), add vegetables, and a portion of carbs.`,

  pain: () =>
    `I'm sorry you're dealing with that. **Sharp, joint or worsening pain isn't something to train through** — please get it checked by a doctor or physiotherapist. Until then, skip any movement that hurts, use lighter pain-free alternatives, and keep moving gently with walks and mobility work.`,

  form: (c, message) => {
    const words = message.toLowerCase().match(/[a-z]{4,}/g) ?? [];
    const planEx = c.plan?.days.flatMap((d) => d.exercises) ?? [];
    const fromPlan = planEx.find((e) => words.some((w) => e.name.toLowerCase().includes(w)));
    const ex =
      EXERCISES.find((e) => e.id === fromPlan?.exercise_id) ??
      EXERCISES.filter((e) => words.some((w) => !["form", "technique", "perform", "should"].includes(w) && e.name.toLowerCase().includes(w))).sort((a, b) => a.name.length - b.name.length)[0];
    if (!ex) return `Which exercise do you mean, ${c.name}? Tell me its name and I'll walk you through the form.`;
    return `**${ex.name}** — key steps:\n\n${ex.instructions.slice(0, 4).map((s, i) => `${i + 1}. ${s.split(/(?<=\.)\s/)[0]}`).join("\n")}\n\nStart light and film a set from the side to check your form.`;
  },
};

const SUPERSEDES: Record<string, string[]> = {
  food_today: ["protein", "targets", "meals"],
  today_workout: ["plan"],
  form: ["strength", "muscle"],
  recomp: ["muscle"],
  supplements: ["meals", "protein"],
};

const FALLBACKS = [
  (c: Ctx) => `I'm not sure I followed that, ${c.name}. I'm best with training, food and recovery — try asking "what's my workout today?" or "how much protein do I have left?"`,
  (c: Ctx) => `Could you rephrase that, ${c.name}? I can tell you about your plan, today's calories, your weight trend, or how to get stronger.`,
  () => `Hmm, that's outside what I can help with in demo mode. Ask me about your workouts, meals, weight progress, sleep or motivation and I'll make it specific to you.`,
];

// ───────────────────────── entry point ─────────────────────────

/** Streams a coach reply through `send`, mimicking the real NDJSON events. */
export async function demoCoachReply(
  message: string,
  { supabase, profile, history }: { supabase: SupabaseClient; profile: Profile; history: { role: string; content: string }[] },
  send: (event: Record<string, unknown>) => void,
) {
  const c: Ctx = { ...(await loadContext(supabase, profile)), p: profile, name: (profile.full_name ?? "").trim().split(/\s+/)[0] || "there" };
  const proposals: ChatProposal[] = [];
  let text: string;

  if (/\b(i ate|i had|just ate|log|ate|eaten)\b/i.test(message) && !/how (much|many)/i.test(message)) {
    const food = message.replace(/^.*?\b(i ate|i had|just ate|log|ate|eaten)\b\s*/i, "").replace(/[.?!]+$/, "");
    const est = estimateMeal(food || message);
    const t = est.items.reduce((s, i) => ({ c: s.c + i.calories, p: s.p + i.protein_g, cb: s.cb + i.carbs_g, f: s.f + i.fat_g }), { c: 0, p: 0, cb: 0, f: 0 });
    const hour = new Date().getHours();
    const meal_type: MealType = /snack/i.test(message) ? "snack" : hour < 11 ? "breakfast" : hour < 16 ? "lunch" : "dinner";
    const after = r0(c.eaten.calories + t.c);
    text = `Nice — that's roughly **${r0(t.c)} kcal** and **${r0(t.p)} g protein**, which would bring you to ${after} of ${c.p.calorie_target ?? 2000} kcal today. Tap Apply on the card below to add it to your log.`;
    proposals.push({
      id: crypto.randomUUID(),
      kind: "log_meal",
      summary: `Log ${meal_type}: ${food || message} (~${r0(t.c)} kcal)`,
      payload: { meal_type, description: (food || message).slice(0, 300), calories: r0(t.c), protein_g: r0(t.p), carbs_g: r0(t.cb), fat_g: r0(t.f) },
    });
  } else {
    let topics = detectTopics(message);
    if (topics.includes("strength") && topics.includes("fat")) topics = ["recomp", ...topics.filter((t) => t !== "strength" && t !== "fat")];
    // Greetings/thanks followed by a real question: answer the question.
    if (topics.length > 1) topics = topics.filter((t) => t !== "greeting" && t !== "thanks");
    // Drop topics a more specific answer already covers.
    for (const [specific, covered] of Object.entries(SUPERSEDES)) {
      if (topics.includes(specific)) topics = topics.filter((t) => !covered.includes(t));
    }

    if (topics.length) {
      text = topics.slice(0, 2).map((t) => ANSWERS[t](c, message)).join("\n\n");
    } else {
      // Rotate fallbacks so a run of unclear messages doesn't get the same reply.
      const previous = new Set(history.filter((m) => m.role === "assistant").map((m) => m.content));
      const options = FALLBACKS.map((f) => f(c));
      text = options.find((o) => !previous.has(o)) ?? options[history.length % options.length];
    }
  }

  await wait(500);
  for (const token of text.match(/\s*\S+\s*/g) ?? []) {
    send({ type: "text", delta: token });
    await wait(18);
  }
  for (const proposal of proposals) send({ type: "proposal", proposal });
  return { text, proposals };
}

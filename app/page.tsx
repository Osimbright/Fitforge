import {
  Activity,
  ArrowRight,
  Bot,
  Brain,
  ChevronDown,
  Crown,
  Dumbbell,
  Flame,
  Home,
  LineChart,
  Salad,
  ShieldCheck,
  Quote,
  Sparkles,
  Star,
  Timer,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/app/avatar";
import { Logo } from "@/components/brand";
import { ArrowLink } from "@/components/ui/arrow-link";
import { Pricing } from "@/components/landing/pricing";
import { getApprovedTestimonials } from "@/lib/data/testimonials";
import { PRO_PRICE } from "@/lib/pricing";
import InteractiveBentoGallery, { type MediaItemType } from "@/components/ui/interactive-bento-gallery";

// Male + female bodybuilders with dumbbells (Pexels #12931805). Swap for your own shot in /public anytime.
const HERO_IMG = "https://images.pexels.com/photos/12931805/pexels-photo-12931805.jpeg?auto=compress&cs=tinysrgb&w=2000";
const GYM_IMG = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80&auto=format&fit=crop";
const HOME_IMG = "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80&auto=format&fit=crop";

const unsplash = (id: string) => `https://images.unsplash.com/${id}?w=1400&q=80&auto=format&fit=crop`;
const pexels = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1400`;

const BEACH_GALLERY: MediaItemType[] = [
  {
    id: 1,
    type: "image",
    title: "Shoreline Sprint",
    desc: "Bare feet, open sky, full send.",
    url: unsplash("photo-1643130079083-235171412962"),
    span: "row-span-4 sm:col-span-1 sm:row-span-3 md:col-span-1 md:row-span-4",
  },
  {
    id: 2,
    type: "image",
    title: "Built on the Sand",
    desc: "Strength that travels with you.",
    url: pexels(12169091),
    span: "row-span-4 sm:col-span-2 sm:row-span-3 md:col-span-2 md:row-span-2",
  },
  {
    id: 3,
    type: "image",
    title: "Tide Runners",
    desc: "Racing the waves at La Jolla.",
    url: unsplash("photo-1470093879860-2221625b28be"),
    span: "row-span-4 sm:col-span-2 sm:row-span-3 md:col-span-1 md:row-span-4",
  },
  {
    id: 4,
    type: "image",
    title: "Squad Intervals",
    desc: "Sand sprints hit different with a crew.",
    url: unsplash("photo-1540539234-c14a20fb7c7b"),
    span: "row-span-4 sm:col-span-1 sm:row-span-3 md:col-span-2 md:row-span-2",
  },
  {
    id: 5,
    type: "image",
    title: "Golden-Hour Cardio",
    desc: "Sunset miles along the water.",
    url: unsplash("photo-1553593155-9e0dc045405c"),
    span: "row-span-4 sm:col-span-1 sm:row-span-3 md:col-span-2 md:row-span-3",
  },
  {
    id: 6,
    type: "image",
    title: "Summer Shred",
    desc: "The results of a plan you stuck to.",
    url: unsplash("photo-1747861913249-8856199e039b"),
    span: "row-span-4 sm:col-span-1 sm:row-span-3 md:col-span-1 md:row-span-3",
  },
  {
    id: 7,
    type: "image",
    title: "Team Beach Run",
    desc: "Conditioning with salt in the air.",
    url: unsplash("photo-1540474861915-87c6b849f6d0"),
    span: "row-span-4 sm:col-span-1 sm:row-span-3 md:col-span-1 md:row-span-3",
  },
];

const FEATURES = [
  { icon: Brain, title: "AI workout plans", body: "A weekly program built from your body, goal, level and schedule — and it adapts as you progress." },
  { icon: Salad, title: "AI diet plans", body: "Meals that hit your calorie and macro targets, match your diet type and cuisine, with a grocery list." },
  { icon: Home, title: "Home or gym", body: "Train anywhere. Tell us your equipment and every exercise in your plan will be one you can actually do." },
  { icon: Timer, title: "Live workout tracker", body: "Log sets, reps and weight with a built-in rest timer. See last session's numbers as you lift." },
  { icon: Bot, title: "24/7 AI coach", body: "Ask anything — form, food, plateaus, soreness. Answers know your profile and your plan." },
  { icon: LineChart, title: "Progress you can see", body: "Weight trends, strength PRs, streaks and a consistency heatmap that keeps you showing up." },
];

const STEPS = [
  { n: "01", title: "Tell us about you", body: "Height, weight, experience, goal, where you train and how you eat. Takes about 2 minutes." },
  { n: "02", title: "Get your forged plan", body: "FitForge calculates your targets and the AI builds a workout plan and diet plan just for you." },
  { n: "03", title: "Train, track, improve", body: "Follow today's workout, log meals in plain words, and let your AI coach keep you on track." },
];

// PLACEHOLDER testimonials, shown only until the first real review is approved (Settings → "Share your
// FitForge story", then approve in Supabase). Delete these before launch: publishing invented reviews as
// genuine is misleading and breaks consumer-protection rules in most countries.
const SAMPLE_TESTIMONIALS = [
  {
    name: "Priya Nair",
    context: "Home training · Beginner",
    result: "−7 kg in 14 weeks",
    quote:
      "I'd never followed a plan longer than two weeks. FitForge gave me 30-minute bodyweight sessions I could do before work, and the meal plan used food I actually cook. The streak heatmap became weirdly addictive.",
  },
  {
    name: "Marcus Bell",
    context: "Gym · Intermediate",
    result: "+20 kg deadlift",
    quote:
      "The live tracker showing last session's numbers mid-set is the feature I didn't know I needed. Progressive overload finally clicked.",
  },
  {
    name: "Sofia Alvarez",
    context: "Home + gym · Vegetarian",
    result: "Hit protein 6 days/week",
    quote:
      "Every other app assumed I eat chicken three times a day. My plan here is fully vegetarian and still hits my macros. Logging meals in plain words takes seconds.",
  },
  {
    name: "Daniel Okafor",
    context: "Gym · Returning after injury",
    result: "Back to squatting pain-free",
    quote:
      "I asked the coach about knee pain and it swapped my squats for lighter alternatives and told me to see a physio — no bro-science. That's when I trusted it.",
  },
  {
    name: "Hannah Kim",
    context: "Home · Busy parent",
    result: "4 workouts a week, 3 months running",
    quote:
      "Twenty minutes, no equipment, done during nap time. The plan adapts when I miss a day instead of making me feel guilty.",
  },
  {
    name: "Leo Martins",
    context: "Gym · Advanced",
    result: "Cut to 12% body fat",
    quote:
      "I was skeptical an AI could program for someone who's lifted for eight years. The weekly reviews and calorie adjustments were spot on for a slow, controlled cut.",
  },
];

const FAQ = [
  {
    q: "Is FitForge free?",
    a: `Yes. AI plans, the AI coach, the workout tracker and progress tracking are all free, with generous daily AI limits. FitForge Pro (from $${PRO_PRICE.monthly}/month, or $${PRO_PRICE.yearly}/year) is coming soon with unlimited coaching and advanced analytics — join the waitlist to hear first.`,
  },
  {
    q: "Is FitForge good for complete beginners?",
    a: "Yes. Beginners get simpler movements, lower volume and clear instructions with images for every exercise. Your plan grows with you.",
  },
  {
    q: "I don't have any equipment. Will it work at home?",
    a: "Absolutely. Choose “Home” and “No equipment” and your plan will use bodyweight exercises only. Add dumbbells or bands later and regenerate.",
  },
  {
    q: "How does the AI decide my calories?",
    a: "We calculate your BMR and daily energy needs with the Mifflin–St Jeor formula, then adjust for your goal. The AI builds meals around those numbers — it doesn't guess them.",
  },
  {
    q: "Is the AI coach a replacement for a doctor?",
    a: "No. The coach gives general fitness and nutrition guidance. For pain, injuries or medical conditions it will always point you to a qualified professional.",
  },
];

// Re-render at most every 5 minutes so newly approved reviews appear.
export const revalidate = 300;

export default async function LandingPage() {
  const approved = await getApprovedTestimonials();
  const testimonials: { id: string; name: string; context: string | null; result: string | null; quote: string; rating: number | null }[] =
    approved.length > 0
      ? approved.map((t) => ({ ...t, name: t.display_name }))
      : SAMPLE_TESTIMONIALS.map((t) => ({ ...t, id: t.name, rating: null }));

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="relative isolate min-h-[min(92vh,860px)] overflow-hidden">
        {/* Portrait photo: full-bleed on mobile, a right-hand panel on desktop so the athletes sit clear of the headline */}
        <div className="absolute inset-y-0 right-0 -z-20 w-full lg:w-[58%]">
          <Image
            src={HERO_IMG}
            alt="Muscular man and woman holding dumbbells in a gym"
            fill
            priority
            className="object-cover object-[center_20%]"
            sizes="(min-width: 1024px) 58vw, 100vw"
          />
          <div className="absolute inset-y-0 left-0 hidden w-64 bg-gradient-to-r from-bg to-transparent lg:block" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/25 to-bg" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />

        <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 md:px-8">
          <Logo />
          <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2 py-1.5 backdrop-blur lg:flex">
            {[
              ["Gallery", "#gallery"],
              ["Features", "#features"],
              ["Home & Gym", "#train-anywhere"],
              ["How it works", "#how"],
              ["Reviews", "#testimonials"],
              ["Pricing", "#pricing"],
              ["FAQ", "#faq"],
            ].map(([label, href]) => (
              <a key={href} href={href} className="rounded-full px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white xl:px-4">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-white/85 hover:text-white sm:block">
              Log in
            </Link>
            <Link href="/signup" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-white/90">
              Sign up
            </Link>
          </div>
        </header>

        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 pb-24 pt-16 md:px-8 md:pt-28 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-lime">
              <Sparkles className="h-3.5 w-3.5" /> AI personal trainer
            </span>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.02] tracking-tight text-white sm:text-6xl md:text-7xl">
              Your Body. Your Plan.
              <br />
              <span className="text-lime">Forged by AI.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/75">
              Personalized workout and diet plans for home or gym, a live workout tracker, and an AI coach that answers
              every question — all built around you.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <ArrowLink href="/signup">Start free</ArrowLink>
              <a href="#how" className="text-sm font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline">
                See how it works
              </a>
            </div>
            <a
              href="#pricing"
              className="group mt-8 inline-flex max-w-full items-center gap-3 rounded-full border border-lime/30 bg-black/40 py-1.5 pl-1.5 pr-4 text-sm text-white/85 backdrop-blur transition-colors hover:border-lime/60 hover:text-white"
            >
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-lime px-2.5 py-1 text-xs font-bold text-black">
                <Crown className="h-3.5 w-3.5" /> PRO
              </span>
              <span className="truncate">
                Unlimited AI coaching from <b className="text-white">${PRO_PRICE.monthly}/mo</b> — coming soon
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-lime transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>

          {/* Floating stat card */}
          <div className="card hidden w-80 shrink-0 bg-surface/80 p-5 backdrop-blur-md lg:block">
            <p className="text-xs font-medium text-lime">Today&apos;s Workout</p>
            <p className="mt-1 text-lg font-semibold">Full Body Strength</p>
            <div className="mt-3 flex gap-4 text-xs text-muted">
              <span className="flex items-center gap-1"><Timer className="h-3.5 w-3.5" /> 45 min</span>
              <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-ember" /> 480 kcal</span>
              <span className="flex items-center gap-1"><Dumbbell className="h-3.5 w-3.5" /> Intermediate</span>
            </div>
            <div className="mt-5 grid grid-cols-7 items-end gap-1.5">
              {[40, 70, 45, 80, 100, 35, 60].map((h, i) => (
                <div key={i} className="rounded-md bg-lime/80" style={{ height: `${h * 0.6}px`, opacity: i === 4 ? 1 : 0.55 }} />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 text-center text-[10px] text-muted">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="border-y border-line bg-surface/50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-8 md:grid-cols-4 md:px-8">
          {[
            ["870+", "exercises with images"],
            ["2 min", "to your first plan"],
            ["Home + Gym", "plans for both"],
            ["24/7", "AI coach on call"],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="font-display text-3xl font-bold text-lime">{v}</p>
              <p className="text-sm text-muted">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Beach gallery ── */}
      <section id="gallery" className="scroll-mt-8 pt-16">
        <InteractiveBentoGallery
          mediaItems={BEACH_GALLERY}
          title="Train Where the Tide Meets the Sand"
          className="max-w-7xl px-5 md:px-8"
        />
      </section>

      {/* ── Features ── */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-24 md:px-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Everything you need
            </span>
            <h2 className="mt-5 max-w-xl font-display text-4xl font-bold tracking-tight md:text-5xl">
              One app for training, food and progress.
            </h2>
          </div>
          <p className="max-w-md text-muted">
            Stop juggling a workout app, a calorie counter and random videos. FitForge connects all of it — and the AI uses
            everything you log to coach you better.
          </p>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card group p-6 transition-colors hover:border-lime/40">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime/10 text-lime transition-colors group-hover:bg-lime group-hover:text-black">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Home vs Gym ── */}
      <section id="train-anywhere" className="mx-auto max-w-7xl px-5 pb-24 md:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { img: GYM_IMG, tag: "Gym", title: "Full gym access", body: "Barbells, machines, cables — progressive programs that push your strength numbers up week after week." },
            { img: HOME_IMG, tag: "Home", title: "No gym? No problem", body: "Bodyweight-only or whatever gear you own. Effective sessions in your living room, 20 minutes or more." },
          ].map((c) => (
            <div key={c.tag} className="group relative isolate h-[420px] overflow-hidden rounded-[1.75rem] border border-line">
              <Image src={c.img} alt={c.title} fill className="-z-10 object-cover transition-transform duration-700 group-hover:scale-105" sizes="(min-width: 768px) 50vw, 100vw" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="flex h-full flex-col justify-end p-7">
                <span className="w-fit rounded-full bg-lime px-3 py-1 text-xs font-bold uppercase tracking-wider text-black">{c.tag}</span>
                <h3 className="mt-4 font-display text-3xl font-bold text-white">{c.title}</h3>
                <p className="mt-2 max-w-md text-white/75">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="hero-gradient border-y border-line">
        <div className="mx-auto max-w-7xl px-5 py-24 md:px-8">
          <h2 className="max-w-2xl font-display text-4xl font-bold tracking-tight md:text-5xl">
            From sign-up to your first workout in <span className="text-lime">three steps</span>.
          </h2>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="card relative overflow-hidden p-7">
                <span className="font-display text-6xl font-bold text-lime/15">{s.n}</span>
                <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Coach preview ── */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-24 md:px-8 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-violet/15 px-3 py-1 text-xs font-semibold text-violet">
            <Bot className="h-3.5 w-3.5" /> AI Coach
          </span>
          <h2 className="mt-5 font-display text-4xl font-bold tracking-tight md:text-5xl">A coach in your pocket that actually knows you.</h2>
          <p className="mt-5 text-muted">
            Your coach sees your goal, your plan and what you&apos;ve logged this week. Ask it to make tomorrow lighter, swap
            a meal, or explain why the scale isn&apos;t moving — and apply its changes with one tap.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {["Personal answers, not generic tips", "One-tap plan changes you approve", "Safety first — no crash diets, no diagnoses"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-lime" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="card space-y-4 p-6">
          <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-lime px-4 py-3 text-sm font-medium text-black">
            My knees feel sore after squats. Should I skip leg day tomorrow?
          </div>
          <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-surface-2 px-4 py-3 text-sm leading-relaxed text-fg/90">
            Some soreness 24–48h after squats is normal, but <b>knee</b> discomfort is worth respecting. I&apos;d swap
            tomorrow&apos;s back squats for glute bridges and step-ups at a lighter load. If the pain is sharp or lasts more
            than a few days, please see a physiotherapist.
          </div>
          <div className="flex max-w-[90%] items-center justify-between gap-3 rounded-2xl border border-lime/30 bg-lime/5 px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-lime" /> Update tomorrow&apos;s workout
            </div>
            <span className="rounded-full bg-lime px-3 py-1 text-xs font-bold text-black">Apply</span>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="scroll-mt-8 border-y border-line bg-surface/40">
        <div className="mx-auto max-w-7xl px-5 py-24 md:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                Testimonials
              </span>
              <h2 className="mt-5 max-w-xl font-display text-4xl font-bold tracking-tight md:text-5xl">
                People who <span className="text-lime">kept showing up</span>.
              </h2>
            </div>
            <p className="max-w-xs text-sm text-muted md:text-right">From beginners at home to lifters in the gym.</p>
          </div>

          <div className="mt-14 columns-1 gap-4 md:columns-2 lg:columns-3">
            {testimonials.map((t, i) => (
              <figure
                key={t.id}
                className={`card mb-4 break-inside-avoid p-6 transition-colors hover:border-lime/40 ${
                  i === 0 ? "border-lime/30 bg-lime/[0.04]" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {t.rating ? (
                    <div className="flex gap-0.5 text-lime" aria-label={`${t.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }).map((_, n) => (
                        <Star key={n} className={`h-4 w-4 ${n < t.rating! ? "fill-current" : "text-muted/40"}`} />
                      ))}
                    </div>
                  ) : (
                    <Quote className="h-7 w-7 text-lime/40" />
                  )}
                  {t.result && <span className="rounded-full bg-lime/10 px-3 py-1 text-xs font-semibold text-lime">{t.result}</span>}
                </div>
                <blockquote className={`mt-4 leading-relaxed text-fg/90 ${i === 0 ? "text-lg" : "text-sm"}`}>
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-5">
                  <Avatar name={t.name} />
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    {t.context && <p className="text-xs text-muted">{t.context}</p>}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <Pricing />

      {/* ── FAQ ── */}
      <section id="faq" className="mx-auto w-full max-w-3xl px-5 pb-24 md:px-8">
        <h2 className="text-center font-display text-4xl font-bold tracking-tight">Questions? Answers.</h2>
        <div className="mt-10 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="card group p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {f.q}
                <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto w-full max-w-7xl px-5 pb-20 md:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-lime px-8 py-14 text-black md:px-14">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-black/10" />
          <div className="absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-black/5" />
          <h2 className="relative max-w-2xl font-display text-4xl font-bold tracking-tight md:text-5xl">
            Ready to forge your best self?
          </h2>
          <p className="relative mt-3 max-w-lg text-black/70">Create your free account and get your personalized plan in minutes.</p>
          <Link
            href="/signup"
            className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-black px-7 py-4 font-semibold text-white hover:bg-black/85"
          >
            Get my plan <Sparkles className="h-4 w-4 text-lime" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-5 py-8 text-sm text-muted md:flex-row md:items-center md:px-8">
          <Logo />
          <p>© {new Date().getFullYear()} FitForge. General fitness guidance only — not medical advice.</p>
        </div>
      </footer>
    </div>
  );
}

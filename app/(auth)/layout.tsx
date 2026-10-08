import Image from "next/image";
import { Logo } from "@/components/brand";
import { DEMO_MODE } from "@/lib/demo/mode";

const SIDE_IMG = "https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=1400&q=80&auto=format&fit=crop";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-5 py-6 md:px-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md animate-fade-up">
            {children}
            {DEMO_MODE && (
              <p className="mt-6 rounded-xl border border-lime/30 bg-lime/10 px-4 py-3 text-sm text-fg">
                <strong>Demo mode</strong> — no backend connected. Log in with any email and password to explore with
                sample data, or sign up to try onboarding.
              </p>
            )}
          </div>
        </div>
        <p className="text-xs text-muted">General fitness guidance only — not medical advice.</p>
      </div>
      <div className="relative m-3 hidden overflow-hidden rounded-[2rem] lg:block">
        <Image src={SIDE_IMG} alt="Athlete training with battle ropes" fill className="object-cover" sizes="50vw" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 p-10">
          <p className="font-display text-4xl font-bold leading-tight text-white">
            Train smarter.
            <br />
            <span className="text-lime">Eat better. Progress faster.</span>
          </p>
          <p className="mt-3 max-w-md text-white/70">
            Your plan is built from your body, your goals and your schedule — then refined by AI every week.
          </p>
        </div>
      </div>
    </div>
  );
}

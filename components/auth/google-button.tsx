"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DEMO_MODE } from "@/lib/demo/mode";
import { createClient } from "@/lib/supabase/client";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/** Minimal typing for the parts of Google Identity Services we use. */
type GoogleId = {
  initialize(config: { client_id: string; nonce: string; callback: (res: { credential: string }) => void }): void;
  renderButton(el: HTMLElement, options: Record<string, string | number>): void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

/**
 * Google's own sign-in button (Google Identity Services). Sign-in happens on our domain, so Google's
 * consent screen names fitforge.fun instead of the Supabase project URL. Falls back to the redirect
 * flow when no client ID is configured (and in demo mode).
 */
export function GoogleButton({ next = "/dashboard" }: { next?: string }) {
  if (!GOOGLE_CLIENT_ID || DEMO_MODE) return <GoogleRedirectButton next={next} />;
  return <GoogleIdentityButton clientId={GOOGLE_CLIENT_ID} next={next} />;
}

function GoogleIdentityButton({ clientId, next }: { clientId: string; next: string }) {
  const router = useRouter();
  const slot = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);

  useEffect(() => {
    if (!scriptReady || !slot.current || !window.google) return;
    const el = slot.current;
    const gid = window.google.accounts.id;
    let cancelled = false;

    (async () => {
      // Google signs a hash of the nonce into the ID token; Supabase checks it against the raw value.
      const nonce = randomNonce();
      const hashedNonce = await sha256Hex(nonce);
      if (cancelled) return;

      gid.initialize({
        client_id: clientId,
        nonce: hashedNonce,
        callback: async ({ credential }) => {
          setBusy(true);
          const { error } = await createClient().auth.signInWithIdToken({ provider: "google", token: credential, nonce });
          if (error) {
            toast.error(error.message);
            setBusy(false);
            return;
          }
          router.replace(next);
          router.refresh();
        },
      });
      gid.renderButton(el, {
        type: "standard",
        theme: "filled_black",
        size: "large",
        shape: "pill",
        text: "continue_with",
        logo_alignment: "center",
        width: Math.min(400, Math.max(200, el.offsetWidth)),
      });
      setRendered(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [scriptReady, clientId, next, router]);

  // Script blocked (ad blocker, strict privacy settings): use the redirect flow instead.
  if (scriptFailed) return <GoogleRedirectButton next={next} />;

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => setScriptFailed(true)}
      />
      <div className="relative flex min-h-11 w-full items-center justify-center">
        <div ref={slot} className="flex w-full justify-center" />
        {(!rendered || busy) && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full border border-line bg-surface text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-label={busy ? "Signing in" : "Loading Google sign-in"} />
          </div>
        )}
      </div>
    </>
  );
}

function randomNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Redirect-based Google sign-in through Supabase. */
function GoogleRedirectButton({ next }: { next: string }) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="secondary" className="w-full" onClick={onClick} loading={loading}>
      {!loading && (
        <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
      )}
      Continue with Google
    </Button>
  );
}

export function Divider({ label = "or" }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

import "server-only";
import { toDateKey } from "@/lib/utils";
import { DEMO_COOKIE, DEMO_USER_ID } from "./mode";
import { blankProfile, EXERCISES, seedStore, USER_TABLES, type DemoStore, type DemoUser } from "./seed";

/**
 * In-memory stand-in for the Supabase client, used in demo mode. Supports the
 * subset of the query builder, auth and storage APIs this app calls. Data lives
 * for the life of the dev server process and resets on restart.
 */

type Row = Record<string, unknown>;
type Cookies = {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options?: Record<string, unknown>): void;
};

const g = globalThis as { __fitforgeDemo?: DemoStore };
function store(): DemoStore {
  return (g.__fitforgeDemo ??= seedStore());
}

const OWNED = new Set<string>(USER_TABLES);

const now = () => new Date().toISOString();
const DEFAULTS: Record<string, () => Row> = {
  workout_plans: () => ({ is_active: true }),
  workout_sessions: () => ({
    plan_id: null, day_index: null, type: "planned", status: "in_progress", started_at: now(),
    ended_at: null, duration_min: null, calories_est: null, total_volume_kg: null, notes: null,
  }),
  session_sets: () => ({ exercise_id: null, reps: null, weight_kg: null, duration_sec: null, completed: true }),
  diet_plans: () => ({ is_active: true }),
  meal_logs: () => ({ log_date: toDateKey(), calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, source: "manual", plan_meal_key: null }),
  water_logs: () => ({ log_date: toDateKey() }),
  body_metrics: () => ({ log_date: toDateKey(), weight_kg: null, waist_cm: null, chest_cm: null, arm_cm: null, photo_path: null }),
  progress_photos: () => ({ session_id: null, taken_on: toDateKey(), caption: null }),
  chat_conversations: () => ({ title: "New chat", updated_at: now() }),
  chat_messages: () => ({ proposals: [] }),
  weekly_reviews: () => ({ wins: [], improvements: [], adjustments: [] }),
  ai_generations: () => ({ input: {} }),
  pro_waitlist: () => ({ billing: "monthly" }),
  testimonials: () => ({ context: null, result: null, status: "pending", approved_at: null, updated_at: now() }),
};

// Rows in these tables are removed along with their parent (ON DELETE CASCADE).
const CASCADES: Record<string, [table: string, fk: string][]> = {
  workout_sessions: [["session_sets", "session_id"]],
  chat_conversations: [["chat_messages", "conversation_id"]],
};

// ───────────────────────── query builder ─────────────────────────

const ISO_TS = /^\d{4}-\d{2}-\d{2}T/;

function same(a: unknown, b: unknown) {
  return a === b || (a != null && b != null && String(a) === String(b));
}

function compare(a: unknown, b: unknown): number {
  if (a == null || b == null) return a == null ? (b == null ? 0 : -1) : 1;
  if (typeof a === "string" && typeof b === "string") {
    if (ISO_TS.test(a) && ISO_TS.test(b)) return Date.parse(a) - Date.parse(b);
    return a < b ? -1 : a > b ? 1 : 0;
  }
  return Number(a) - Number(b);
}

function likeToRegex(pattern: string, flags: string) {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".");
  return new RegExp(`^${escaped}$`, flags);
}

type Result = { data: unknown; error: { message: string; code?: string } | null; count: number | null; status: number };

class DemoQuery implements PromiseLike<Result> {
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private columns = "*";
  private returning = false;
  private wantCount = false;
  private payload: Row | Row[] = [];
  private conflictCols = ["id"];
  private filters: ((r: Row) => boolean)[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private window: { from: number; to?: number } | null = null;
  private mode: "many" | "single" | "maybe" = "many";

  constructor(
    private table: string,
    private uid: string | null,
  ) {}

  select(columns = "*", opts?: { count?: string; head?: boolean }) {
    this.columns = columns;
    if (this.op !== "select") this.returning = true;
    if (opts?.count) this.wantCount = true;
    return this;
  }
  insert(values: Row | Row[]) {
    this.op = "insert";
    this.payload = values;
    return this;
  }
  upsert(values: Row | Row[], opts?: { onConflict?: string }) {
    this.op = "upsert";
    this.payload = values;
    if (opts?.onConflict) this.conflictCols = opts.onConflict.split(",").map((c) => c.trim());
    return this;
  }
  update(values: Row) {
    this.op = "update";
    this.payload = values;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }

  private where(fn: (r: Row) => boolean) {
    this.filters.push(fn);
    return this;
  }
  eq(col: string, v: unknown) { return this.where((r) => same(r[col], v)); }
  neq(col: string, v: unknown) { return this.where((r) => !same(r[col], v)); }
  gt(col: string, v: unknown) { return this.where((r) => r[col] != null && compare(r[col], v) > 0); }
  gte(col: string, v: unknown) { return this.where((r) => r[col] != null && compare(r[col], v) >= 0); }
  lt(col: string, v: unknown) { return this.where((r) => r[col] != null && compare(r[col], v) < 0); }
  lte(col: string, v: unknown) { return this.where((r) => r[col] != null && compare(r[col], v) <= 0); }
  in(col: string, values: unknown[]) { return this.where((r) => values.some((v) => same(r[col], v))); }
  is(col: string, v: unknown) { return this.where((r) => (v === null ? r[col] == null : r[col] === v)); }
  like(col: string, p: string) { return this.where((r) => likeToRegex(p, "").test(String(r[col] ?? ""))); }
  ilike(col: string, p: string) { return this.where((r) => likeToRegex(p, "i").test(String(r[col] ?? ""))); }
  contains(col: string, values: unknown[]) {
    return this.where((r) => Array.isArray(r[col]) && values.every((v) => (r[col] as unknown[]).includes(v)));
  }
  match(obj: Row) { return this.where((r) => Object.entries(obj).every(([k, v]) => same(r[k], v))); }
  not(col: string, operator: string, v: unknown) {
    if (operator === "is") return this.where((r) => (v === null ? r[col] != null : r[col] !== v));
    if (operator === "eq") return this.where((r) => !same(r[col], v));
    throw new Error(`Demo backend: .not("${operator}") isn't supported`);
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, asc: opts?.ascending ?? true });
    return this;
  }
  limit(n: number) {
    this.window = { from: this.window?.from ?? 0, to: (this.window?.from ?? 0) + n - 1 };
    return this;
  }
  range(from: number, to: number) {
    this.window = { from, to };
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }
  returns() {
    return this;
  }

  then<A = Result, B = never>(onOk?: ((v: Result) => A | PromiseLike<A>) | null, onErr?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve()
      .then(() => this.run())
      .then(onOk, onErr);
  }

  // ── execution ──

  private visible(r: Row) {
    if (this.table === "exercises") return true;
    if (this.table === "profiles") return r.id === this.uid;
    if (OWNED.has(this.table)) return r.user_id === this.uid;
    return false;
  }

  private rows(): Row[] {
    if (this.table === "exercises") return EXERCISES as unknown as Row[];
    const t = store().tables;
    return (t[this.table] ??= []);
  }

  private project(rows: Row[]) {
    const cols = this.columns.split(",").map((c) => c.trim()).filter(Boolean);
    const all = cols.length === 0 || cols.includes("*");
    return rows.map((r) => structuredClone(all ? r : Object.fromEntries(cols.map((c) => [c, r[c] ?? null]))));
  }

  private finish(rows: Row[], count: number | null = null): Result {
    if (this.mode === "many") return { data: this.project(rows), error: null, count, status: 200 };
    if (rows.length === 1) return { data: this.project(rows)[0], error: null, count, status: 200 };
    if (rows.length === 0 && this.mode === "maybe") return { data: null, error: null, count, status: 200 };
    return {
      data: null,
      error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" },
      count,
      status: 406,
    };
  }

  private run(): Result {
    if (!this.uid && this.table !== "exercises") {
      return this.op === "select" ? this.finish([]) : { data: null, error: { message: "Not signed in" }, count: null, status: 401 };
    }
    const table = this.rows();
    const matches = () => table.filter((r) => this.visible(r) && this.filters.every((f) => f(r)));

    switch (this.op) {
      case "select": {
        let rows = matches();
        const count = this.wantCount ? rows.length : null;
        if (this.orders.length) {
          rows = [...rows].sort((a, b) => {
            for (const { col, asc } of this.orders) {
              const c = compare(a[col], b[col]);
              if (c) return asc ? c : -c;
            }
            return 0;
          });
        }
        if (this.window) rows = rows.slice(this.window.from, this.window.to === undefined ? undefined : this.window.to + 1);
        return this.finish(rows, count);
      }
      case "insert":
      case "upsert": {
        if (this.table === "exercises") return { data: null, error: { message: "Read-only table" }, count: null, status: 403 };
        const inserted: Row[] = [];
        for (const values of [this.payload].flat()) {
          const key = this.conflictCols;
          const existing =
            this.op === "upsert" && key.every((c) => values[c] != null)
              ? table.find((r) => this.visible(r) && key.every((c) => same(r[c], values[c])))
              : undefined;
          if (existing) {
            Object.assign(existing, structuredClone(values));
            inserted.push(existing);
            continue;
          }
          const row: Row = { id: crypto.randomUUID(), created_at: now(), ...DEFAULTS[this.table]?.(), ...structuredClone(values) };
          table.push(row);
          inserted.push(row);
        }
        return this.returning ? this.finish(inserted) : { data: null, error: null, count: null, status: 201 };
      }
      case "update": {
        const rows = matches();
        const patch = structuredClone(this.payload as Row);
        for (const r of rows) Object.assign(r, patch);
        return this.returning ? this.finish(rows) : { data: null, error: null, count: null, status: 204 };
      }
      case "delete": {
        const rows = matches();
        const doomed = new Set(rows);
        store().tables[this.table] = table.filter((r) => !doomed.has(r));
        for (const [child, fk] of CASCADES[this.table] ?? []) {
          const ids = new Set(rows.map((r) => r.id));
          store().tables[child] = (store().tables[child] ?? []).filter((r) => !ids.has(r[fk] as string));
        }
        if (this.table === "workout_plans") {
          const ids = new Set(rows.map((r) => r.id));
          for (const s of store().tables.workout_sessions) if (ids.has(s.plan_id as string)) s.plan_id = null;
        }
        return this.returning ? this.finish(rows) : { data: null, error: null, count: null, status: 204 };
      }
    }
  }
}

// ───────────────────────── auth ─────────────────────────

const COOKIE_OPTIONS = { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 } as const;

function toAuthUser(u: DemoUser) {
  return { id: u.id, email: u.email, user_metadata: u.user_metadata, app_metadata: {}, aud: "authenticated", created_at: u.created_at };
}

function deleteUserData(id: string) {
  const s = store();
  s.users = s.users.filter((u) => u.id !== id);
  s.tables.profiles = s.tables.profiles.filter((p) => p.id !== id);
  for (const t of USER_TABLES) s.tables[t] = s.tables[t].filter((r) => r.user_id !== id);
}

const ok = <T>(data: T) => ({ data, error: null });

/** Demo stand-in for createServerClient(); auth state is a cookie holding the user id. */
export function createDemoClient(cookieStore: Cookies) {
  const setSession = (id: string | null) => {
    try {
      cookieStore.set(DEMO_COOKIE, id ?? "", id ? COOKIE_OPTIONS : { ...COOKIE_OPTIONS, maxAge: 0 });
    } catch {
      // Server Components can't write cookies; only actions and route handlers sign in/out.
    }
  };
  const currentUser = () => {
    const id = cookieStore.get(DEMO_COOKIE)?.value;
    return id ? store().users.find((u) => u.id === id) ?? null : null;
  };

  return {
    from: (table: string) => new DemoQuery(table, currentUser()?.id ?? null),

    rpc: async (fn: string) => {
      if (fn === "public_testimonials") {
        const rows = (store().tables.testimonials ?? []).filter((r) => r.status === "approved" && r.consent);
        return ok(rows.map(({ id, display_name, context, result, quote, rating, approved_at }) => ({ id, display_name, context, result, quote, rating, approved_at })));
      }
      return ok(true);
    },

    auth: {
      getUser: async () => {
        const u = currentUser();
        return { data: { user: u ? toAuthUser(u) : null }, error: null };
      },
      getClaims: async () => {
        const u = currentUser();
        return ok(u ? { claims: { sub: u.id, email: u.email } } : null);
      },
      /** Any password works. Unknown emails sign in to the sample account. */
      signInWithPassword: async ({ email }: { email: string; password: string }) => {
        const s = store();
        const u = s.users.find((x) => x.email.toLowerCase() === email.toLowerCase()) ?? s.users.find((x) => x.id === DEMO_USER_ID);
        if (!u) return { data: { user: null, session: null }, error: { message: "Wrong email or password" } };
        setSession(u.id);
        return ok({ user: toAuthUser(u), session: { user: toAuthUser(u) } });
      },
      /** Creates a fresh account that starts at onboarding. */
      signUp: async ({ email, options }: { email: string; password: string; options?: { data?: Record<string, unknown> } }) => {
        const s = store();
        if (s.users.some((x) => x.email.toLowerCase() === email.toLowerCase())) {
          return { data: { user: null, session: null }, error: { message: "User already registered" } };
        }
        const meta = options?.data ?? {};
        const u: DemoUser = { id: crypto.randomUUID(), email, user_metadata: meta, created_at: now() };
        s.users.push(u);
        s.tables.profiles.push({ ...blankProfile(u.id, (meta.full_name as string) ?? null, (meta.phone as string) ?? null) });
        setSession(u.id);
        return ok({ user: toAuthUser(u), session: { user: toAuthUser(u) } });
      },
      signOut: async () => {
        setSession(null);
        return { error: null };
      },
      resetPasswordForEmail: async () => ok({}),
      resend: async () => ok({}),
      updateUser: async () => ok({ user: currentUser() && toAuthUser(currentUser()!) }),
      exchangeCodeForSession: async () => ok({}),
      verifyOtp: async () => ok({}),
      admin: {
        deleteUser: async (id: string) => {
          deleteUserData(id);
          return ok({});
        },
      },
    },

    storage: {
      from: () => ({
        // Uploads are kept in memory (as data URLs) for the life of the dev server.
        upload: async (path: string, file: Blob, opts?: { contentType?: string }) => {
          const bytes = Buffer.from(await file.arrayBuffer());
          files().set(path, `data:${opts?.contentType ?? (file.type || "image/jpeg")};base64,${bytes.toString("base64")}`);
          return ok({ path });
        },
        list: async () => ok([]),
        remove: async (paths: string[]) => {
          for (const p of paths) files().delete(p);
          return ok([]);
        },
        // Seeded rows point at files that were never uploaded, so they get sample photos.
        createSignedUrls: async (paths: string[]) =>
          ok(paths.map((path) => ({ path, signedUrl: files().get(path) ?? samplePhoto(path), error: null }))),
      }),
    },
  };
}

const gFiles = globalThis as { __fitforgeDemoFiles?: Map<string, string> };
const files = () => (gFiles.__fitforgeDemoFiles ??= new Map());

function samplePhoto(path: string) {
  const n = Number(path.match(/demo-(\d+)/)?.[1] ?? 0);
  return DEMO_PHOTOS[n % DEMO_PHOTOS.length];
}

const DEMO_PHOTOS = [
  "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?w=600&q=70&auto=format&fit=crop",
];

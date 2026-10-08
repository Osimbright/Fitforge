// Shared domain types. Row shapes mirror supabase/migrations/0001_init.sql.

export type Gender = "male" | "female" | "other";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type Goal = "lose_fat" | "build_muscle" | "get_stronger" | "stay_fit" | "endurance";
export type TrainingLocation = "home" | "gym" | "both";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Units = "metric" | "imperial";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  gender: Gender | null;
  dob: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  experience_level: ExperienceLevel | null;
  training_months: number | null;
  goal: Goal | null;
  days_per_week: number | null;
  session_minutes: number | null;
  training_location: TrainingLocation | null;
  equipment: string[];
  diet_type: string | null;
  allergies: string[];
  cuisine: string | null;
  meals_per_day: number | null;
  injuries: string | null;
  activity_level: ActivityLevel | null;
  units: Units;
  timezone: string | null;
  bmr: number | null;
  tdee: number | null;
  calorie_target: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  water_ml: number | null;
  onboarding_step: number;
  onboarding_complete: boolean;
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  category: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  instructions: string[];
  images: string[];
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  plan_id: string | null;
  day_index: number | null;
  title: string;
  type: "planned" | "custom";
  status: "in_progress" | "completed";
  started_at: string;
  ended_at: string | null;
  duration_min: number | null;
  calories_est: number | null;
  total_volume_kg: number | null;
  notes: string | null;
}

export interface SessionSet {
  id: string;
  session_id: string;
  exercise_id: string | null;
  exercise_name: string;
  set_no: number;
  reps: number | null;
  weight_kg: number | null;
  duration_sec: number | null;
  completed: boolean;
  created_at: string;
}

export interface MealLog {
  id: string;
  log_date: string;
  meal_type: MealType;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: "plan" | "ai" | "manual";
  plan_meal_key: string | null;
  created_at: string;
}

export interface BodyMetric {
  id: string;
  log_date: string;
  weight_kg: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  photo_path: string | null;
}

export interface ProgressPhoto {
  id: string;
  session_id: string | null;
  taken_on: string;
  path: string;
  caption: string | null;
  created_at: string;
}

export interface StoredWeeklyReview {
  id: string;
  period_start: string;
  period_end: string;
  score: number;
  headline: string;
  wins: string[];
  improvements: string[];
  adjustments: string[];
  message: string;
  created_at: string;
}

export type TestimonialStatus = "pending" | "approved" | "rejected";

/** What the landing page shows (from the public_testimonials() function). */
export interface PublicTestimonial {
  id: string;
  display_name: string;
  context: string | null;
  result: string | null;
  quote: string;
  rating: number;
}

export interface Testimonial extends PublicTestimonial {
  consent: boolean;
  status: TestimonialStatus;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  updated_at: string;
}

export interface ChatProposal {
  id: string;
  kind: "update_workout_day" | "swap_meal" | "log_meal";
  summary: string;
  payload: Record<string, unknown>;
  applied?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  proposals: ChatProposal[];
  created_at: string;
}

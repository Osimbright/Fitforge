import { Bot, Dumbbell, LayoutDashboard, LibraryBig, LineChart, Salad, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/diet", label: "Nutrition", icon: Salad },
  { href: "/progress", label: "Progress", icon: LineChart },
  { href: "/coach", label: "AI Coach", icon: Bot },
  { href: "/exercises", label: "Exercises", icon: LibraryBig },
  { href: "/profile", label: "Settings", icon: Settings },
] as const;

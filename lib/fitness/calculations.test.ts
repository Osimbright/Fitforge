import { describe, expect, it } from "vitest";
import {
  ageFromDob,
  bmi,
  bmiCategory,
  bmr,
  calorieTarget,
  cmToFtIn,
  computeTargets,
  estimated1RM,
  ftInToCm,
  macros,
  tdee,
  waterTargetMl,
} from "./calculations";

describe("bmi", () => {
  it("computes kg/m²", () => {
    expect(bmi(70, 175)).toBe(22.9);
    expect(bmi(95, 180)).toBe(29.3);
  });
  it("categorises", () => {
    expect(bmiCategory(17).label).toBe("Underweight");
    expect(bmiCategory(22.9).label).toBe("Healthy");
    expect(bmiCategory(27).label).toBe("Overweight");
    expect(bmiCategory(31).label).toBe("Obese");
  });
});

describe("bmr (Mifflin–St Jeor)", () => {
  it("matches published reference values", () => {
    // 10*70 + 6.25*175 - 5*30 + 5 = 1648.75
    expect(bmr(70, 175, 30, "male")).toBe(1649);
    // 10*60 + 6.25*165 - 5*25 - 161 = 1345.25
    expect(bmr(60, 165, 25, "female")).toBe(1345);
  });
});

describe("tdee & calorie target", () => {
  it("applies activity multiplier", () => {
    expect(tdee(1649, "moderate")).toBe(2556);
  });
  it("applies goal adjustment and floors at a safe minimum", () => {
    expect(calorieTarget(2556, "lose_fat", "male")).toBe(2040);
    expect(calorieTarget(2556, "build_muscle", "male")).toBe(2810);
    expect(calorieTarget(2556, "stay_fit", "male")).toBe(2560);
    expect(calorieTarget(1300, "lose_fat", "female")).toBe(1200);
  });
});

describe("macros", () => {
  it("adds up to roughly the calorie target", () => {
    const m = macros(2040, 70, "lose_fat");
    expect(m.protein_g).toBe(140);
    expect(m.fat_g).toBe(57);
    const kcal = m.protein_g * 4 + m.carbs_g * 4 + m.fat_g * 9;
    expect(Math.abs(kcal - 2040)).toBeLessThan(10);
  });
});

describe("computeTargets", () => {
  it("returns a full target set", () => {
    const t = computeTargets({
      weightKg: 70,
      heightCm: 175,
      ageYears: 30,
      gender: "male",
      activity: "moderate",
      goal: "lose_fat",
    });
    expect(t).toMatchObject({ bmr: 1649, tdee: 2556, calorie_target: 2040, water_ml: 2450 });
  });
});

describe("misc", () => {
  it("water target rounds to 50 ml", () => {
    expect(waterTargetMl(72)).toBe(2500);
  });
  it("age from dob respects birthday not yet reached", () => {
    expect(ageFromDob("2000-12-31", new Date("2026-10-04"))).toBe(25);
    expect(ageFromDob("2000-01-01", new Date("2026-10-04"))).toBe(26);
  });
  it("epley 1RM", () => {
    expect(estimated1RM(100, 5)).toBe(116.7);
    expect(estimated1RM(100, 1)).toBe(100);
  });
  it("height conversions round-trip", () => {
    expect(cmToFtIn(180)).toEqual({ ft: 5, in: 11 });
    expect(ftInToCm(5, 11)).toBe(180.3);
  });
});

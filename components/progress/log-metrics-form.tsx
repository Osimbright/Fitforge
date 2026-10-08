"use client";

import { Camera } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { addProgressPhoto } from "@/app/(app)/actions/photos";
import { logWeight } from "@/app/(app)/actions/tracking";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, UnitInput } from "@/components/ui/input";
import { downscaleImage } from "@/lib/image";

export function LogMetricsForm({ lastWeight }: { lastWeight: number | null }) {
  const [pending, startTransition] = useTransition();
  const [weight, setWeight] = useState(lastWeight?.toString() ?? "");
  const [waist, setWaist] = useState("");
  const [chest, setChest] = useState("");
  const [arm, setArm] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const opt = (v: string) => (v ? Number(v) : undefined);

  const submit = () =>
    startTransition(async () => {
      const res = await logWeight({ weight_kg: Number(weight), waist_cm: opt(waist), chest_cm: opt(chest), arm_cm: opt(arm) });
      if (!res.ok) return void toast.error(res.error);
      if (file) {
        // Photos go to the progress gallery, separate from the weigh-in itself.
        const form = new FormData();
        form.set("file", await downscaleImage(file));
        const up = await addProgressPhoto(form);
        if (!up.ok) return void toast.error("Weight saved, but the photo failed: " + up.error);
      }
      toast.success("Progress logged 📈");
      setFile(null);
      setWaist("");
      setChest("");
      setArm("");
    });

  return (
    <Card>
      <h3 className="font-semibold">Log today</h3>
      <div className="mt-4 space-y-3">
        <Field label="Weight">
          <UnitInput unit="kg" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Waist"><UnitInput unit="cm" value={waist} onChange={(e) => setWaist(e.target.value)} className="pr-10" /></Field>
          <Field label="Chest"><UnitInput unit="cm" value={chest} onChange={(e) => setChest(e.target.value)} className="pr-10" /></Field>
          <Field label="Arm"><UnitInput unit="cm" value={arm} onChange={(e) => setArm(e.target.value)} className="pr-10" /></Field>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-3 text-sm text-muted hover:border-lime/50 hover:text-fg cursor-pointer"
        >
          <Camera className="h-4 w-4" /> {file ? file.name : "Add a progress photo (private)"}
        </button>
        <Button className="w-full" onClick={submit} loading={pending} disabled={!Number(weight)}>
          Save
        </Button>
      </div>
    </Card>
  );
}

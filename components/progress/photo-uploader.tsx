"use client";

import { Camera, Check, ImagePlus, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { addProgressPhoto } from "@/app/(app)/actions/photos";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { downscaleImage } from "@/lib/image";
import { cn } from "@/lib/utils";

/**
 * Picks a photo (camera or library on phones), previews it with an optional caption,
 * then uploads it. `sessionId` links the photo to the workout it was taken after.
 */
export function PhotoUploader({
  sessionId,
  onUploaded,
  children,
  className,
}: {
  sessionId?: string;
  onUploaded?: () => void;
  /** Custom trigger content; defaults to the gallery's "Add photo" tile. */
  children?: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function pick(f: File | undefined) {
    if (inputRef.current) inputRef.current.value = ""; // allow re-picking the same file
    if (!f) return;
    if (!f.type.startsWith("image/")) return void toast.error("That file isn't an image");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function close() {
    setFile(null);
    setPreview(null);
    setCaption("");
  }

  function save() {
    if (!file) return;
    startTransition(async () => {
      const form = new FormData();
      form.set("file", await downscaleImage(file));
      if (caption.trim()) form.set("caption", caption.trim());
      if (sessionId) form.set("session_id", sessionId);
      const res = await addProgressPhoto(form);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Progress photo saved 📸");
      close();
      onUploaded?.();
      router.refresh();
    });
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <button type="button" onClick={() => inputRef.current?.click()} className={cn("cursor-pointer", className)}>
        {children ?? (
          <span className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface-2/50 text-muted transition-colors hover:border-lime/60 hover:text-lime">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lime/10 text-lime">
              <ImagePlus className="h-5 w-5" />
            </span>
            <span className="text-xs font-semibold">Add photo</span>
          </span>
        )}
      </button>

      <Dialog open={file !== null} onClose={close} title="New progress photo">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
          <img src={preview} alt="Selected progress photo" className="mx-auto max-h-[55vh] w-auto rounded-2xl object-contain" />
        )}
        <Input
          className="mt-4"
          placeholder="Add a note — e.g. “Leg day pump” (optional)"
          maxLength={200}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <Lock className="h-3 w-3" /> Only you can see your photos.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => inputRef.current?.click()} disabled={pending}>
            <Camera className="h-4 w-4" /> Choose another
          </Button>
          <Button onClick={save} loading={pending}>
            <Check className="h-4 w-4" /> Save photo
          </Button>
        </div>
      </Dialog>
    </>
  );
}

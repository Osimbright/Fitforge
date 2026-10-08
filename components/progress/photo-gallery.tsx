"use client";

import { ChevronLeft, ChevronRight, Dumbbell, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteProgressPhoto } from "@/app/(app)/actions/photos";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PhotoUploader } from "./photo-uploader";

export type GalleryPhoto = { id: string; url: string; taken_on: string; caption: string | null; workout: string | null };

const PREVIEW_COUNT = 7; // + the "Add photo" tile = two rows of four

const short = (key: string) => new Date(key + "T12:00:00").toLocaleDateString("en", { day: "numeric", month: "short" });
const long = (key: string) => new Date(key + "T12:00:00").toLocaleDateString("en", { weekday: "short", day: "numeric", month: "long", year: "numeric" });

/** Newest-first grid of progress photos with an upload tile and a full-size viewer. */
export function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [pending, startTransition] = useTransition();

  const visible = showAll ? photos : photos.slice(0, PREVIEW_COUNT);
  const current = open !== null ? photos[open] : null;

  function remove(photo: GalleryPhoto) {
    if (!window.confirm("Delete this photo? This can't be undone.")) return;
    startTransition(async () => {
      const res = await deleteProgressPhoto(photo.id);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Photo deleted");
      setOpen(null);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        <PhotoUploader className="aspect-[3/4]" />
        {visible.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpen(i)}
            className="group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-xl bg-surface-3"
          >
            {/* Signed URLs are short-lived, so skip the image optimizer */}
            <Image src={p.url} alt={`Progress photo from ${short(p.taken_on)}`} fill unoptimized sizes="200px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            {p.workout && (
              <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-lime" title={`After ${p.workout}`}>
                <Dumbbell className="h-3 w-3" />
              </span>
            )}
            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px]">{short(p.taken_on)}</span>
          </button>
        ))}
      </div>

      {photos.length > PREVIEW_COUNT && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 cursor-pointer text-sm font-medium text-lime hover:underline">
          {showAll ? "Show less" : `Show all ${photos.length} photos`}
        </button>
      )}

      <Dialog open={current !== null} onClose={() => setOpen(null)} title={current ? long(current.taken_on) : ""} className="max-w-xl">
        {current && open !== null && (
          <div>
            <div className="relative overflow-hidden rounded-2xl bg-surface-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed/data URLs at natural aspect ratio */}
              <img src={current.url} alt={`Progress photo from ${long(current.taken_on)}`} className="mx-auto max-h-[60vh] w-auto object-contain" />
              <NavButton side="left" disabled={open === 0} onClick={() => setOpen(open - 1)} />
              <NavButton side="right" disabled={open === photos.length - 1} onClick={() => setOpen(open + 1)} />
            </div>
            {(current.caption || current.workout) && (
              <div className="mt-4 space-y-1.5 text-sm">
                {current.caption && <p className="text-fg/90">{current.caption}</p>}
                {current.workout && (
                  <p className="flex items-center gap-1.5 text-muted">
                    <Dumbbell className="h-3.5 w-3.5 text-lime" /> After {current.workout}
                  </p>
                )}
              </div>
            )}
            <div className="mt-5 flex items-center justify-between">
              <span className="text-xs text-muted">
                {open + 1} of {photos.length}
              </span>
              <Button variant="danger" size="sm" onClick={() => remove(current)} loading={pending}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function NavButton({ side, disabled, onClick }: { side: "left" | "right"; disabled: boolean; onClick: () => void }) {
  if (disabled) return null;
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Newer photo" : "Older photo"}
      className={`absolute top-1/2 -translate-y-1/2 ${side === "left" ? "left-2" : "right-2"} flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

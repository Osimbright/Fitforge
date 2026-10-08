"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// MediaItemType defines the structure of a media item
export interface MediaItemType {
  id: number;
  type: "image" | "video";
  title: string;
  desc: string;
  url: string;
  /** Tailwind grid span classes, e.g. "md:col-span-2 md:row-span-2" */
  span: string;
}

// MediaItem renders either a video or image based on item.type
const MediaItem = ({ item, className, onClick }: { item: MediaItemType; className?: string; onClick?: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);

  // Play/pause videos as they scroll in and out of view
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => setIsInView(entry.isIntersecting)),
      { root: null, rootMargin: "50px", threshold: 0.1 },
    );
    observer.observe(video);
    return () => observer.unobserve(video);
  }, []);

  useEffect(() => {
    let mounted = true;
    const video = videoRef.current;

    const handleVideoPlay = async () => {
      if (!video || !isInView || !mounted) return;
      try {
        if (video.readyState >= 3) {
          setIsBuffering(false);
          await video.play();
        } else {
          setIsBuffering(true);
          await new Promise((resolve) => {
            video.oncanplay = resolve;
          });
          if (mounted) {
            setIsBuffering(false);
            await video.play();
          }
        }
      } catch (error) {
        console.warn("Video playback failed:", error);
      }
    };

    if (isInView) handleVideoPlay();
    else video?.pause();

    return () => {
      mounted = false;
      video?.pause();
    };
  }, [isInView]);

  if (item.type === "video") {
    return (
      <div className={cn(className, "relative overflow-hidden")}>
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          onClick={onClick}
          playsInline
          muted
          loop
          preload="auto"
          style={{
            opacity: isBuffering ? 0.8 : 1,
            transition: "opacity 0.2s",
            transform: "translateZ(0)",
            willChange: "transform",
          }}
        >
          <source src={item.url} type="video/mp4" />
        </video>
        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        )}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote gallery media; sizes vary per tile
    <img
      src={item.url}
      alt={item.title}
      className={cn(className, "cursor-pointer object-cover")}
      onClick={onClick}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
};

// GalleryModal displays the selected media item full-screen with a draggable dock
interface GalleryModalProps {
  selectedItem: MediaItemType;
  onClose: () => void;
  setSelectedItem: (item: MediaItemType | null) => void;
  mediaItems: MediaItemType[];
}

const GalleryModal = ({ selectedItem, onClose, setSelectedItem, mediaItems }: GalleryModalProps) => {
  const [dockPosition, setDockPosition] = useState({ x: 0, y: 0 });

  // Lock page scroll and close on Escape while the modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <>
      {/* Main Modal */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={selectedItem.title}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed inset-0 z-40 h-dvh w-full overflow-hidden bg-bg/80 backdrop-blur-lg"
      >
        <div className="flex h-full flex-col">
          <div className="flex flex-1 items-center justify-center p-2 pb-24 sm:p-3 sm:pb-24 md:p-4 md:pb-24">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedItem.id}
                className="relative aspect-[16/9] h-auto max-h-[70vh] w-full max-w-[95%] overflow-hidden rounded-xl border border-white/10 shadow-2xl sm:max-w-[85%] md:max-w-4xl"
                initial={{ y: 20, scale: 0.97 }}
                animate={{ y: 0, scale: 1, transition: { type: "spring", stiffness: 500, damping: 30, mass: 0.5 } }}
                exit={{ y: 20, scale: 0.97, transition: { duration: 0.15 } }}
                onClick={onClose}
              >
                <MediaItem item={selectedItem} className="h-full w-full bg-black/40 object-cover" onClick={onClose} />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 sm:p-4 md:p-5">
                  <h3 className="text-base font-semibold text-white sm:text-lg md:text-xl">{selectedItem.title}</h3>
                  <p className="mt-1 text-xs text-white/80 sm:text-sm">{selectedItem.desc}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Close Button */}
        <motion.button
          type="button"
          aria-label="Close gallery"
          className="absolute right-3 top-3 rounded-full border border-line bg-surface-2/80 p-2.5 text-fg backdrop-blur-sm hover:bg-surface-3 md:right-5 md:top-5"
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X className="h-4 w-4" />
        </motion.button>
      </motion.div>

      {/* Draggable Dock */}
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.1}
        initial={false}
        animate={{ x: dockPosition.x, y: dockPosition.y }}
        exit={{ opacity: 0 }}
        onDragEnd={(_, info) => {
          setDockPosition((prev) => ({ x: prev.x + info.offset.x, y: prev.y + info.offset.y }));
        }}
        className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 touch-none"
      >
        <motion.div className="relative cursor-grab rounded-xl border border-lime/30 bg-lime/15 shadow-lg backdrop-blur-xl active:cursor-grabbing">
          <div className="flex items-center -space-x-2 px-3 py-2">
            {mediaItems.map((item, index) => (
              <motion.div
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItem(item);
                }}
                style={{ zIndex: selectedItem.id === item.id ? 30 : mediaItems.length - index }}
                className={cn(
                  "group relative h-8 w-8 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg hover:z-20 sm:h-9 sm:w-9 md:h-10 md:w-10",
                  selectedItem.id === item.id ? "shadow-lg ring-2 ring-white/70" : "hover:ring-2 hover:ring-white/30",
                )}
                initial={{ rotate: index % 2 === 0 ? -15 : 15 }}
                animate={{
                  scale: selectedItem.id === item.id ? 1.2 : 1,
                  rotate: selectedItem.id === item.id ? 0 : index % 2 === 0 ? -15 : 15,
                  y: selectedItem.id === item.id ? -8 : 0,
                }}
                whileHover={{ scale: 1.3, rotate: 0, y: -10, transition: { type: "spring", stiffness: 400, damping: 25 } }}
              >
                <MediaItem item={item} className="h-full w-full" onClick={() => setSelectedItem(item)} />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-white/20" />
                {selectedItem.id === item.id && (
                  <motion.div
                    layoutId="activeGlow"
                    className="absolute -inset-2 bg-white/20 blur-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
};

interface InteractiveBentoGalleryProps {
  mediaItems: MediaItemType[];
  title: string;
  description?: string;
  className?: string;
}

const InteractiveBentoGallery: React.FC<InteractiveBentoGalleryProps> = ({ mediaItems, title, description, className }) => {
  const [selectedItem, setSelectedItem] = useState<MediaItemType | null>(null);
  const [items, setItems] = useState(mediaItems);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className={cn("mx-auto w-full max-w-4xl px-4 py-8", className)}>
      <div className="mb-8 text-center">
        <motion.h2
          className="bg-gradient-to-r from-fg via-lime to-lime bg-clip-text font-display text-3xl font-bold tracking-tight text-transparent sm:text-4xl md:text-5xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {title}
        </motion.h2>
        {description && (
          <motion.p
            className="mt-3 text-sm text-muted sm:text-base"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {description}
          </motion.p>
        )}
      </div>

      <motion.div
        className="grid auto-rows-[60px] grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
        }}
      >
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            layoutId={`media-${item.id}`}
            className={cn("relative cursor-move overflow-hidden rounded-xl border border-line", item.span)}
            onClick={() => !isDragging && setSelectedItem(item)}
            variants={{
              hidden: { y: 50, scale: 0.9, opacity: 0 },
              visible: {
                y: 0,
                scale: 1,
                opacity: 1,
                transition: { type: "spring", stiffness: 350, damping: 25, delay: index * 0.05 },
              },
            }}
            whileHover={{ scale: 1.02 }}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={1}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={(_, info) => {
              setIsDragging(false);
              const moveDistance = info.offset.x + info.offset.y;
              if (Math.abs(moveDistance) > 50) {
                const newItems = [...items];
                const draggedItem = newItems[index];
                const targetIndex = moveDistance > 0 ? Math.min(index + 1, items.length - 1) : Math.max(index - 1, 0);
                newItems.splice(index, 1);
                newItems.splice(targetIndex, 0, draggedItem);
                setItems(newItems);
              }
            }}
          >
            <MediaItem
              item={item}
              className="absolute inset-0 h-full w-full"
              onClick={() => !isDragging && setSelectedItem(item)}
            />
            <motion.div
              className="absolute inset-0 flex flex-col justify-end p-2 sm:p-3 md:p-4"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="absolute inset-0 flex flex-col justify-end p-2 sm:p-3 md:p-4">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <h3 className="relative line-clamp-1 text-xs font-medium text-white sm:text-sm md:text-base">{item.title}</h3>
                <p className="relative mt-0.5 line-clamp-2 text-[10px] text-white/70 sm:text-xs md:text-sm">{item.desc}</p>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      <AnimatePresence>
        {selectedItem && (
          <GalleryModal
            selectedItem={selectedItem}
            onClose={() => setSelectedItem(null)}
            setSelectedItem={setSelectedItem}
            mediaItems={items}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default InteractiveBentoGallery;

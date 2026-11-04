"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Decorative photo that removes itself if it can't load, so the gradient and
 * icon underneath show instead of a broken-image icon.
 */
export default function CoverImage({ src, className = "" }: { src: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement | null>(null);

  // The image may already have failed before React attached onError.
  useEffect(() => {
    const el = ref.current;
    if (el?.complete && el.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={src} alt="" loading="lazy" onError={() => setFailed(true)} className={className} />
  );
}

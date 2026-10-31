"use client";

import { useRef, useState } from "react";

/** Image slider rendered inside a `.photo` box: arrows, dots, swipe and keyboard support. */
export function PhotoSlider({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const touchX = useRef<number | null>(null);
  const n = images.length;

  const go = (e: React.SyntheticEvent, to: number) => {
    // The slider can sit inside a clickable card/label: never trigger it.
    e.preventDefault();
    e.stopPropagation();
    setI((to + n) % n);
  };

  return (
    <div
      className="slider"
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label={alt}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(e, i - 1);
        if (e.key === "ArrowRight") go(e, i + 1);
      }}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) go(e, dx < 0 ? i + 1 : i - 1);
      }}
    >
      <div className="slider-track" style={{ transform: `translateX(-${i * 100}%)` }}>
        {images.map((src, k) => (
          <div
            key={src + k}
            className="slider-slide"
            role="img"
            aria-label={`${alt} ${k + 1}/${n}`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
      </div>
      <button type="button" className="slider-btn prev" aria-label="Previous" onClick={(e) => go(e, i - 1)}>‹</button>
      <button type="button" className="slider-btn next" aria-label="Next" onClick={(e) => go(e, i + 1)}>›</button>
      <div className="slider-dots">
        {images.map((_, k) => (
          <button
            key={k}
            type="button"
            className={k === i ? "dot active" : "dot"}
            aria-label={`${k + 1}/${n}`}
            onClick={(e) => go(e, k)}
          />
        ))}
      </div>
    </div>
  );
}

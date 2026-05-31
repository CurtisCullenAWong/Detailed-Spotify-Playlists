import React, { useRef, useState, useEffect } from "react";

interface TextCarouselProps {
  text: string;
  className?: string;
}

export function TextCarousel({ text, className }: TextCarouselProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    const container = containerRef.current;
    if (el && container) {
      setOverflows(el.scrollWidth > container.offsetWidth);
    }
  }, [text]);

  return (
    <span ref={containerRef} className={`inline-flex min-w-0 whitespace-nowrap overflow-hidden ${className ?? ""}`}>
      <style>{`@keyframes marquee-loop{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      {overflows ? (
        <span className="inline-flex whitespace-nowrap group-hover:[animation:marquee-loop_5s_linear_infinite]">
          <span ref={textRef} className="pr-4">{text}</span>
          <span className="pr-4">{text}</span>
        </span>
      ) : (
        <span ref={textRef} className="truncate">{text}</span>
      )}
    </span>
  );
}

import { useEffect, useRef, useState } from "react";

export default function Marquee({ text, className = "" }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    const c = containerRef.current;
    const s = contentRef.current;
    if (!c || !s) return;
    setOverflow(s.scrollWidth > c.clientWidth + 2);
  }, [text]);

  if (!overflow) {
    return (
      <div ref={containerRef} className={`overflow-hidden ${className}`}>
        <span ref={contentRef} className="truncate block">
          {text}
        </span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`overflow-hidden marquee-mask ${className}`}>
      <div className="marquee-track">
        <span ref={contentRef}>{text}</span>
        <span aria-hidden>{text}</span>
      </div>
    </div>
  );
}

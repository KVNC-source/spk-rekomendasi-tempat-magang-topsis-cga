import { useEffect, useRef, useState } from "react";
import { formatNumber } from "../../lib/format";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const easeOut = (t) => 1 - (1 - t) ** 3;

/**
 * A number that counts up once, the first time it scrolls into view (<= 600ms),
 * and never again — later value changes simply show the new value. Screen
 * readers get the final value immediately.
 */
export default function CountUp({ value, digits = 0, duration = 600, className = "" }) {
  const ref = useRef(null);
  const latest = useRef(value);
  const played = useRef(false);
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0));

  useEffect(() => {
    latest.current = value;
    if (played.current) setShown(value);
  }, [value]);

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion()) {
      played.current = true;
      return undefined;
    }
    let frame;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || played.current) return;
        played.current = true;
        observer.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min((now - start) / duration, 1);
          setShown(latest.current * easeOut(t));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [duration]);

  return (
    <span ref={ref} className={`font-mono ${className}`}>
      <span aria-hidden="true">{formatNumber(shown, digits)}</span>
      <span className="sr-only">{formatNumber(value, digits)}</span>
    </span>
  );
}

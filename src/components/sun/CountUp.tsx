import { useEffect, useRef, useState } from "react";

export function CountUp({ to, duration = 1400, suffix = "", prefix = "" }: { to: number; duration?: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !started) {
            setStarted(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(to * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [started, to, duration]);

  const display = Number.isInteger(to) ? Math.round(val).toLocaleString("en-IN") : val.toFixed(1);
  return <span ref={ref}>{prefix}{display}{suffix}</span>;
}

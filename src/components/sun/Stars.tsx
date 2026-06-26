import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  size?: number;
  className?: string;
}

export function Stars({ value, size = 16, className }: Props) {
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value >= n;
        const half = !filled && value >= n - 0.5;
        return (
          <span key={n} className="relative inline-flex" style={{ width: size, height: size }}>
            <Star className="text-sun-300/40" style={{ width: size, height: size }} />
            {(filled || half) && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: half ? size / 2 : size }}>
                <Star className="fill-sun-400 text-sun-400" style={{ width: size, height: size }} />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

interface PickerProps {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}
export function StarPicker({ value, onChange, size = 28 }: PickerProps) {
  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className="rounded p-0.5 transition hover:scale-110"
        >
          <Star
            className={cn(value >= n ? "fill-sun-400 text-sun-400" : "text-sun-300/40")}
            style={{ width: size, height: size }}
          />
        </button>
      ))}
    </div>
  );
}

import { Camera, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { SunButton } from "./SunButton";

interface SearchBarProps {
  defaultQ?: string;
  defaultCity?: string;
}

export function SearchBar({ defaultQ = "", defaultCity = "" }: SearchBarProps) {
  const navigate = useNavigate();
  const [q, setQ] = useState(defaultQ);
  const [city, setCity] = useState(defaultCity);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        navigate({
          to: "/search",
          search: {
            q: q || undefined,
            city: city || undefined,
          } as any,
        });
      }}
      className="flex w-full max-w-2xl flex-col gap-2 rounded-3xl bg-white p-2 shadow-warm md:flex-row md:items-center md:rounded-full md:gap-0"
    >
      <label className="flex flex-1 items-center gap-3 rounded-2xl px-4 py-3 md:rounded-full">
        <Camera className="h-5 w-5 shrink-0 text-sun-600" />
        <div className="flex w-full flex-col">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            What to shoot
          </span>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Wedding, fashion, newborn…"
            className="w-full bg-transparent text-[15px] font-medium text-ink placeholder:text-ink-muted/70 focus:outline-none"
          />
        </div>
      </label>

      <span className="hidden h-10 w-px bg-line md:block" />

      <label className="flex flex-1 items-center gap-3 rounded-2xl px-4 py-3 md:rounded-full">
        <MapPin className="h-5 w-5 shrink-0 text-sun-600" />
        <div className="flex w-full flex-col">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            City
          </span>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Delhi, Mumbai, Bengaluru…"
            className="w-full bg-transparent text-[15px] font-medium text-ink placeholder:text-ink-muted/70 focus:outline-none"
          />
        </div>
      </label>

      <SunButton size="lg" className="md:rounded-full" type="submit">
        <Search className="h-4 w-4" />
        Search
      </SunButton>
    </form>
  );
}

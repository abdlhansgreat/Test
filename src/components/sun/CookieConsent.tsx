import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { Link } from "@tanstack/react-router";

const COOKIE_NAME = "pl_cookie_consent";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(name + "="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const exp = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/; SameSite=Lax`;
}

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!getCookie(COOKIE_NAME)) setShow(true);
  }, []);

  const choose = (val: "accepted" | "declined") => {
    setCookie(COOKIE_NAME, val, 180);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 md:px-6 md:pb-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-line bg-white p-4 shadow-soft md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sun-50 text-sun-700">
              <Cookie className="h-5 w-5" />
            </span>
            <p className="text-[14.5px] leading-relaxed text-ink">
              We use essential cookies to keep PhotoLancer working, and optional cookies to understand usage. You can decline non-essential ones at any time.{" "}
              <Link to="/cookie-policy" className="font-semibold text-sun-700 underline">Read our cookie policy</Link>.
            </p>
          </div>
          <div className="flex gap-2 md:flex-shrink-0">
            <button
              onClick={() => choose("declined")}
              className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-sun-50"
            >
              Decline
            </button>
            <button
              onClick={() => choose("accepted")}
              className="rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:opacity-95"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

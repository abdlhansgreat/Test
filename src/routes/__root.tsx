import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Camera, Search } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "../lib/auth-context";
import { Toaster } from "../components/ui/sonner";
import { CookieConsent } from "../components/sun/CookieConsent";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary text-white shadow-warm">
          <Camera className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="font-display text-6xl font-extrabold text-ink">404</h1>
        <h2 className="mt-2 font-display text-xl font-bold text-ink">We couldn't find that page</h2>
        <p className="mt-2 text-sm text-ink-muted">
          The link may be broken or the page may have moved. Try searching for a photographer instead.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            to="/search"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold text-white shadow-warm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-500 focus-visible:ring-offset-2"
          >
            <Search className="h-4 w-4" /> Find a photographer
          </Link>
          <Link
            to="/"
            className="inline-flex items-center rounded-full border border-line bg-white px-5 py-2.5 text-sm font-bold text-ink transition hover:border-sun-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-500 focus-visible:ring-offset-2"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PhotoLancer — Find a photographer you'll actually love" },
      {
        name: "description",
        content:
          "India's photographer marketplace and network. 12,000+ verified photographers across 60+ cities for weddings, fashion, newborn, product and more — backed by the India Photographers Club.",
      },
      { name: "author", content: "PhotoLancer" },
      { name: "theme-color", content: "#FF6A00" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "PhotoLancer" },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:title", content: "PhotoLancer — Find a photographer you'll actually love" },
      {
        property: "og:description",
        content:
          "India's photographer marketplace. Discover, message, and book verified photographers — or get hired as a second shooter.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "PhotoLancer — Find a photographer you'll actually love" },
      { name: "description", content: "PhotoLancer is a platform for photographers to showcase and sell their work, enabling clients to discover and license images quickly." },
      { property: "og:description", content: "PhotoLancer is a platform for photographers to showcase and sell their work, enabling clients to discover and license images quickly." },
      { name: "twitter:description", content: "PhotoLancer is a platform for photographers to showcase and sell their work, enabling clients to discover and license images quickly." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/dedfac64-bc65-44c7-9395-d7ee0cbc8789/id-preview-f6faf28c--2c81a0de-8114-4ba5-91f1-969916aad75c.lovable.app-1781404593930.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/dedfac64-bc65-44c7-9395-d7ee0cbc8789/id-preview-f6faf28c--2c81a0de-8114-4ba5-91f1-969916aad75c.lovable.app-1781404593930.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon-512.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <CookieConsent />
        <Toaster position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

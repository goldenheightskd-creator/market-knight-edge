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

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BottomNav } from "../components/BottomNav";
import { Header } from "../components/Header";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-accent mono">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">Try again</button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#06080f" },
      { title: "Market.knight — Pro Trading Toolkit" },
      { name: "description", content: "Market.knight: level calculator, risk sizing, session clock, trade journal and SMC learning — all in one dark-themed trading toolkit." },
      { property: "og:title", content: "Market.knight — Pro Trading Toolkit" },
      { property: "og:description", content: "Market.knight: level calculator, risk sizing, session clock, trade journal and SMC learning — all in one dark-themed trading toolkit." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Market.knight — Pro Trading Toolkit" },
      { name: "twitter:description", content: "Market.knight: level calculator, risk sizing, session clock, trade journal and SMC learning — all in one dark-themed trading toolkit." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8f62a14f-b68e-40b2-af58-7a4e495b0aa7/id-preview-74c0c8cc--8c07c76b-7ea0-414e-892c-f7af639289d6.lovable.app-1781555146179.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8f62a14f-b68e-40b2-af58-7a4e495b0aa7/id-preview-74c0c8cc--8c07c76b-7ea0-414e-892c-f7af639289d6.lovable.app-1781555146179.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" },
    ],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "name": "Market.knight",
            "url": "https://market-knight-edge.lovable.app",
            "description": "Professional ICT-inspired trading command center with level calculator, risk sizing, session clock, trade journal and SMC learning."
          },
          {
            "@type": "Organization",
            "name": "Market.knight",
            "url": "https://market-knight-edge.lovable.app"
          },
          {
            "@type": "SoftwareApplication",
            "name": "Market.knight Pro Trading Toolkit",
            "applicationCategory": "FinanceApplication",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "description": "A dark-themed trading toolkit featuring level calculator, ICT command center, risk calculator, screen marker alerts, session planner, trade journal, and interactive SMC learning modules."
          }
        ]
      }),
    }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col mx-auto max-w-2xl">
        <Header />
        <main className="flex-1 pb-24 pt-2 px-3">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </QueryClientProvider>
  );
}

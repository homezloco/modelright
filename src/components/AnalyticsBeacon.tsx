'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Cookieless page-view beacon (q-0042). Fires one sendBeacon POST to
 * /api/track on mount and on each client-side pathname change. Skips
 * /admin (ops traffic would dominate the stats at this scale) and honors
 * Do Not Track. Fire-and-forget: never blocks navigation, never throws.
 */
export default function AnalyticsBeacon() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    if (navigator.doNotTrack === '1') return;

    // First-touch UTM attribution: snapshot the landing URL's utm_*
    // params into sessionStorage so SPA navs keep the campaign context.
    // Storage can be blocked (private mode) — send no utm fields rather
    // than break.
    let utm: Record<string, string> = {};
    try {
      const stored = sessionStorage.getItem('mr_utm');
      if (stored) {
        utm = JSON.parse(stored) as Record<string, string>;
      } else {
        const q = new URLSearchParams(window.location.search);
        for (const k of ['utm_source', 'utm_medium', 'utm_campaign']) {
          const v = q.get(k);
          if (v) utm[k] = v.slice(0, 100);
        }
        if (Object.keys(utm).length > 0) {
          sessionStorage.setItem('mr_utm', JSON.stringify(utm));
        }
      }
    } catch {
      /* storage unavailable or corrupt value — skip attribution */
    }

    const payload = JSON.stringify({
      path: pathname + window.location.search,
      // external referrer only on the first hit; SPA navs report own origin
      referrer: first.current ? document.referrer : window.location.origin + '/',
      screen: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      // installed PWA / F11 fullscreen legitimately has viewport == screen —
      // the server's headless check exempts these
      display: displayMode(),
      ...utm,
    });
    first.current = false;

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([payload], { type: 'text/plain' }));
      } else {
        void fetch('/api/track', { method: 'POST', body: payload, keepalive: true });
      }
    } catch {
      /* analytics must never break a page */
    }
  }, [pathname]);

  return null;
}

function displayMode(): string {
  try {
    for (const m of ['fullscreen', 'standalone', 'minimal-ui']) {
      if (window.matchMedia(`(display-mode: ${m})`).matches) return m;
    }
    // iOS home-screen apps predating display-mode support
    if ((navigator as Navigator & { standalone?: boolean }).standalone) return 'standalone';
    if (document.fullscreenElement) return 'fullscreen';
  } catch {
    /* matchMedia unavailable */
  }
  return 'browser';
}

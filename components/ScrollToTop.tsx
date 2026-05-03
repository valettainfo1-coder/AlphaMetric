"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function ScrollToTopInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    // Immediate scroll — no delays to avoid visible jitter
    window.scrollTo(0, 0);
    // Single delayed check in case dynamic content shifts the page
    const t = setTimeout(() => {
      if (window.scrollY > 0) window.scrollTo(0, 0);
    }, 100);
    return () => clearTimeout(t);
  }, [pathname, searchParams]);
  return null;
}

export default function ScrollToTop() {
  return (
    <Suspense fallback={null}>
      <ScrollToTopInner />
    </Suspense>
  );
}

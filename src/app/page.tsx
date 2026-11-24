import { Home } from "@/components/Home";
import { loadFeed } from "@/lib/feed";
import type { Feed } from "@/lib/types";

// Incremental static regeneration: the home page is served as static HTML from
// the CDN (instant first paint, even in slow in-app browsers) and rebuilt in the
// background every 15 seconds. If a rebuild fails, the last good page keeps serving.
export const revalidate = 15;

export default async function Page() {
  let initial: Feed | null = null;
  try {
    initial = await loadFeed();
  } catch {
    initial = null;
  }
  return <Home initial={initial} />;
}

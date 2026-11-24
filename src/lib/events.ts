// Irish retail calendar for 2026. Ireland observes GMT in November, so midnight local = 00:00 UTC.
export const BLACK_FRIDAY = Date.parse("2026-11-27T00:00:00Z");
export const CYBER_MONDAY = Date.parse("2026-11-30T00:00:00Z");
const DAY = 86_400_000;

export function eventStatus(now: number): { label: string; sub: string } | null {
  if (now < BLACK_FRIDAY) {
    const days = Math.ceil((BLACK_FRIDAY - now) / DAY);
    return { label: days === 1 ? "Black Friday is tomorrow" : `Black Friday is in ${days} days`, sub: "Friday 27 November" };
  }
  if (now < BLACK_FRIDAY + DAY) return { label: "It's Black Friday", sub: "Spot a price? Post it, and check others' claims before you buy." };
  if (now < CYBER_MONDAY) return { label: "Black Friday weekend", sub: "Cyber Monday is 30 November." };
  if (now < CYBER_MONDAY + DAY) return { label: "It's Cyber Monday", sub: "Online deals ending tonight are flagged by the community." };
  return null;
}

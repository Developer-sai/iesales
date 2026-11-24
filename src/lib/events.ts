// Irish retail calendar. Dates are computed per year, so the app never goes stale.
// Ireland is on GMT (UTC) in winter and IST (UTC+1) in summer; midnight UTC is close enough for countdowns.
const DAY = 86_400_000;

export interface SaleEvent {
  id: string;
  name: string;
  emoji: string;
  start: number; // inclusive, ms
  end: number; // exclusive, ms
  blurb: string;
  peak: number; // the "big day" the countdown aims at
}

const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);

/** Nth weekday (0=Sun) of a month. */
function nthWeekday(y: number, m: number, weekday: number, n: number): number {
  const first = new Date(utc(y, m, 1)).getUTCDay();
  return utc(y, m, 1 + ((weekday - first + 7) % 7) + (n - 1) * 7);
}

/** Easter Sunday (Anonymous Gregorian algorithm). */
function easter(y: number): number {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(y, month, day);
}

function eventsForYear(y: number): SaleEvent[] {
  const blackFriday = nthWeekday(y, 11, 5, 4);
  const cyberMonday = blackFriday + 3 * DAY;
  const easterSun = easter(y);
  const mothersDay = easterSun - 21 * DAY; // 4th Sunday of Lent (Ireland and UK)
  const fathersDay = nthWeekday(y, 6, 0, 3);
  const ev = (id: string, name: string, emoji: string, start: number, end: number, peak: number, blurb: string): SaleEvent => ({ id: `${id}-${y}`, name, emoji, start, end, peak, blurb });
  return [
    ev("new-year", "New Year sales", "🎆", utc(y, 1, 1), utc(y, 2, 1), utc(y, 1, 2), "Winter clearance and January sales are on. Check the real 30-day-low before you buy."),
    ev("valentines", "Valentine's Day", "💝", utc(y, 2, 7), utc(y, 2, 15), utc(y, 2, 14), "Gift deals, flowers, dinners and treats for 14 February."),
    ev("st-patricks", "St Patrick's Day", "☘️", utc(y, 3, 10), utc(y, 3, 18), utc(y, 3, 17), "Parade-weekend offers, travel and pub-and-dine deals."),
    ev("mothers-day", "Mother's Day", "💐", mothersDay - 10 * DAY, mothersDay + DAY, mothersDay, "Gift offers for Mother's Day in Ireland."),
    ev("easter", "Easter", "🐣", easterSun - 9 * DAY, easterSun + 2 * DAY, easterSun, "Easter eggs, bank-holiday sales and short-break deals."),
    ev("fathers-day", "Father's Day", "👔", fathersDay - 10 * DAY, fathersDay + DAY, fathersDay, "Tech, tools and gift deals for Father's Day."),
    ev("summer", "Summer sales", "☀️", utc(y, 7, 1), utc(y, 8, 16), utc(y, 7, 15), "Mid-season clearance, holiday gear and garden deals."),
    ev("back-to-school", "Back to School", "🎒", utc(y, 8, 10), utc(y, 9, 16), utc(y, 8, 25), "Uniforms, laptops, stationery and lunchbox deals."),
    ev("halloween", "Halloween", "🎃", utc(y, 10, 15), utc(y, 11, 1), utc(y, 10, 31), "Costumes, sweets and decorations, usually marked down on the day."),
    ev("singles-day", "Singles' Day", "🛍️", utc(y, 11, 10), utc(y, 11, 13), utc(y, 11, 11), "11.11 online sales, often a warm-up for Black Friday."),
    ev("black-friday", "Black Friday & Cyber Monday", "🔥", blackFriday - 7 * DAY, cyberMonday + DAY, blackFriday, "The big one. Post what you spot and check others' claims before you buy."),
    ev("christmas", "Christmas deals", "🎄", utc(y, 12, 1), utc(y, 12, 25), utc(y, 12, 24), "Gifts, food, toys and last-minute Christmas offers."),
    ev("boxing-day", "Boxing Day sales", "🎁", utc(y, 12, 26), utc(y + 1, 1, 1), utc(y, 12, 26), "Post-Christmas clearance in-store and online."),
  ];
}

function allEvents(now: number): SaleEvent[] {
  const y = new Date(now).getUTCFullYear();
  return [y - 1, y, y + 1].flatMap(eventsForYear).sort((a, b) => a.start - b.start);
}

export interface EventView extends SaleEvent {
  live: boolean;
  days: number; // days until start (upcoming) or until end (live)
}

function view(e: SaleEvent, now: number): EventView {
  const live = now >= e.start && now < e.end;
  return { ...e, live, days: Math.max(0, Math.ceil(((live ? e.end : e.start) - now) / DAY)) };
}

/** Events running now plus the next ones coming up, soonest first. */
export function saleCalendar(now: number, count = 6): EventView[] {
  const list = allEvents(now).filter((e) => e.end > now).slice(0, count + 2);
  return list.map((e) => view(e, now)).sort((a, b) => Number(b.live) - Number(a.live) || a.start - b.start).slice(0, count);
}

/** Headline for the hero: the live event (most specific wins), else the next one within 6 weeks. */
export function eventStatus(now: number): { label: string; sub: string; emoji: string; live: boolean; name: string } | null {
  const upcoming = allEvents(now).filter((e) => e.end > now);
  const live = upcoming.filter((e) => now >= e.start).sort((a, b) => b.start - a.start)[0];
  if (live) {
    const peakDays = Math.ceil((live.peak - now) / DAY);
    const when = peakDays > 1 ? ` · big day in ${peakDays} days` : peakDays === 1 ? " · big day tomorrow" : "";
    return { label: `Live now: ${live.name}${when}`, sub: live.blurb, emoji: live.emoji, live: true, name: live.name };
  }
  const next = upcoming[0];
  if (next && next.start - now <= 42 * DAY) {
    const days = Math.ceil((next.start - now) / DAY);
    return { label: `${next.name} ${days === 1 ? "starts tomorrow" : `in ${days} days`}`, sub: next.blurb, emoji: next.emoji, live: false, name: next.name };
  }
  return null;
}

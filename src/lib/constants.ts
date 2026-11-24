import type { Category } from "./types";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://iesales.ie").replace(/\/$/, "");
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@iesales.ie";
export const IS_LIVE = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "tech", label: "Tech & Gaming" },
  { id: "home", label: "Home & Kitchen" },
  { id: "fashion", label: "Fashion & Beauty" },
  { id: "grocery", label: "Groceries" },
  { id: "kids", label: "Kids & Toys" },
  { id: "travel", label: "Travel & Experiences" },
  { id: "other", label: "Other" },
];

export const COUNTIES = [
  "Carlow", "Cavan", "Clare", "Cork", "Donegal", "Dublin", "Galway", "Kerry", "Kildare", "Kilkenny",
  "Laois", "Leitrim", "Limerick", "Longford", "Louth", "Mayo", "Meath", "Monaghan", "Offaly",
  "Roscommon", "Sligo", "Tipperary", "Waterford", "Westmeath", "Wexford", "Wicklow"
];

// Suggestions only (plain-text names; no logos or brand assets are used anywhere).
export const RETAILER_SUGGESTIONS = [
  "Currys", "Harvey Norman", "Power City", "DID Electrical", "Argos", "Amazon.ie", "Smyths Toys",
  "Dunnes Stores", "Tesco", "SuperValu", "Lidl", "Aldi", "Penneys", "Arnotts", "Brown Thomas",
  "Elverys", "JD Sports", "Boots", "Woodies", "Harvey Norman", "Other",
];

const PILL_COLOURS = [
  "bg-emerald-100 text-emerald-900 ring-emerald-300",
  "bg-sky-100 text-sky-900 ring-sky-300",
  "bg-violet-100 text-violet-900 ring-violet-300",
  "bg-amber-100 text-amber-900 ring-amber-300",
  "bg-rose-100 text-rose-900 ring-rose-300",
  "bg-teal-100 text-teal-900 ring-teal-300",
  "bg-indigo-100 text-indigo-900 ring-indigo-300",
  "bg-orange-100 text-orange-900 ring-orange-300",
];

export function pillClass(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PILL_COLOURS[h % PILL_COLOURS.length];
}

// Quick-filter chips for in-store sightings (matched against branch, title and note text).
export const HOTSPOTS = [
  "Kildare Village", "Dundrum", "Blanchardstown", "Liffey Valley", "Jervis", "Henry Street",
  "Grafton Street", "Mahon Point", "Galway", "Limerick",
];

export const OPERATOR_NAME = process.env.NEXT_PUBLIC_OPERATOR_NAME || "[Operator name: set NEXT_PUBLIC_OPERATOR_NAME]";

export const MIN_AGE = 16;
export const OPERATOR_ADDRESS = process.env.NEXT_PUBLIC_OPERATOR_ADDRESS || "[Postal address: set NEXT_PUBLIC_OPERATOR_ADDRESS]";
// Optional: company number / CRO number / business-name registration, if the operator has one.
export const OPERATOR_REG = process.env.NEXT_PUBLIC_OPERATOR_REG || "";

import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Is this Black Friday deal genuine? An Irish shopper's guide",
  description: "Irish law says a 'was' price must be the lowest price in the previous 30 days. How to check, what to report, and how to avoid scams.",
  alternates: { canonical: "/guide" },
};

const a = "font-medium text-emerald-700 underline underline-offset-2";

export default function Guide() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 text-slate-800">
      <Link href="/" className={a}>&larr; Back to deals</Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Is this Black Friday deal genuine?</h1>
      <p className="mt-2 text-slate-600">A short guide for shoppers in Ireland. Last checked 24 November 2026. This is general information, not legal advice.</p>

      <h2 className="mt-8 text-xl font-bold">1. The 30-day rule</h2>
      <p className="mt-2">
        When a shop in Ireland advertises a price reduction, it must show the <strong>prior price</strong>. That is the lowest price the item was sold for in at least the 30 days before the reduction.
        A discount must be calculated from that price, not from an old list price or a price that was only briefly raised.
        The consumer watchdog, the{" "}
        <a className={a} href="https://www.ccpc.ie/business/help-for-business/guidelines-for-business/price-reductions/" target="_blank" rel="noopener noreferrer">CCPC</a>,
        has successfully prosecuted retailers for breaking this rule.
      </p>

      <h2 className="mt-8 text-xl font-bold">2. Check before you buy</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li>Open the shop&apos;s own page and compare the price with the one shown here. Prices change quickly.</li>
        <li>Look for the &quot;was&quot; price. A reduction with no prior price shown should make you cautious.</li>
        <li>Check the price on at least one other Irish shop, and look at a price-history chart if one exists for the item.</li>
        <li>Add delivery, returns and any extra fees to the final price.</li>
        <li>Be sure you are on the .ie version of a shop. Terms differ between a shop&apos;s Irish and international sites.</li>
      </ul>

      <h2 className="mt-8 text-xl font-bold">3. How iesales.ie helps</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li>Every deal shows the claimed prior price and any evidence link the poster gave. Posts with no evidence are labelled.</li>
        <li>Anyone signed in can vote a deal a legit bargain, a misleading price, or expired. Posts that enough people flag are hidden for review.</li>
        <li>There are no ads and no affiliate links, so no one earns money from you clicking.</li>
        <li>All prices are reported by shoppers and are not verified by us. Always confirm with the shop.</li>
      </ul>

      <h2 className="mt-8 text-xl font-bold">4. Spotted a misleading price?</h2>
      <p className="mt-2">
        Vote &quot;Misleading price&quot; on the deal here so other shoppers see it. You can also report a shop to the CCPC through{" "}
        <a className={a} href="https://www.ccpc.ie/consumers/" target="_blank" rel="noopener noreferrer">ccpc.ie</a>.
        Keep a screenshot with the date and the price.
      </p>

      <h2 className="mt-8 text-xl font-bold">5. Scam signs</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li>A well-known item at an impossibly low price on an unfamiliar shop.</li>
        <li>Pressure such as a countdown or &quot;only 2 left&quot; on a site you have never heard of.</li>
        <li>Payment only by bank transfer, gift cards or crypto. Pay by card so you can ask your bank for a chargeback.</li>
        <li>A .ie web address does not prove the business is Irish.</li>
      </ul>

      <p className="mt-8 text-sm text-slate-500">
        Corrections or takedown requests: <a className={a} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </main>
  );
}

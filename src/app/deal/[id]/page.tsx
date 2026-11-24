import type { Metadata } from "next";
import { DealPage } from "@/components/DealPage";
import { formatEuro, verdict } from "@/lib/hotScore";
import { createPublicClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const sb = createPublicClient();
    if (sb) {
      const { data } = await sb.from("deal_feed")
        .select("title, retailer, sale_price, legit_votes, fake_votes")
        .eq("id", id).eq("is_hidden", false).maybeSingle();
      if (data) {
        const title = `${data.title} at ${data.retailer}: ${formatEuro(Number(data.sale_price))}`;
        const description = `Community-reported price, unverified. ${verdict({ legit_votes: data.legit_votes, fake_votes: data.fake_votes }).label}. Free Irish deal tracker, zero ads.`;
        return { title, description, openGraph: { title, description, type: "article" }, twitter: { card: "summary_large_image", title, description } };
      }
    }
  } catch { /* fall through to defaults */ }
  return { title: "Deal on iesales.ie" };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <DealPage id={id} />;
}

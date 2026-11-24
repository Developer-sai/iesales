import type { ReactNode } from "react";
import { CONTACT_EMAIL, MIN_AGE, OPERATOR_ADDRESS, OPERATOR_NAME, OPERATOR_REG } from "@/lib/constants";

export const H = ({ children }: { children: ReactNode }) => <h3 className="mt-4 text-sm font-bold text-slate-900">{children}</h3>;
export const P = ({ children }: { children: ReactNode }) => <p className="mt-1 text-sm leading-relaxed text-slate-700">{children}</p>;
export const UPDATED = "24 November 2026";

// Service-provider details that the E-Commerce Regulations 2003 (S.I. 68/2003) require to be easy to find.
export function OperatorLine() {
  return <>{OPERATOR_NAME}, {OPERATOR_ADDRESS}{OPERATOR_REG ? `, ${OPERATOR_REG}` : ""}.</>;
}

export function PledgeBody() {
  return (
    <>
      <P>iesales.ie is a free community tool for shoppers in Ireland. It currently makes <strong>€0</strong>.</P>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
        <li>No advertising or ad networks.</li>
        <li>No affiliate links or commission. Links to shops are plain outbound links.</li>
        <li>No sponsored or paid placement, and no paid tier.</li>
        <li>No tracking cookies and no analytics that profile you.</li>
        <li>No selling or sharing of your data.</li>
      </ul>
      <P>If any of this ever changes, we will say so on this page and on the home page before it takes effect, and you will be able to delete your account first.</P>
      <P>Prices on the site are reported by shoppers and are not checked by us. iesales.ie is not affiliated with, endorsed by or sponsored by any shop or brand named on the site.</P>
    </>
  );
}

export function TermsBody({ onNotice }: { onNotice?: () => void }) {
  return (
    <>
      <p className="text-xs text-slate-500">Last updated {UPDATED}. Operated by <OperatorLine /> Contact: {CONTACT_EMAIL}.</p>
      <H>1. What this site is</H>
      <P>iesales.ie lets shoppers share and discuss prices. All prices, prior prices, stock and queue information are posted by users, are <strong>not verified</strong> by us, and may be wrong or out of date. Auto-fill reads a shop page with an AI model and can be wrong, so check what it fills in. Always check the shop&apos;s own listing before you buy. We are not a retailer and we do not sell anything.</P>
      <H>2. Who can use it</H>
      <P>Anyone can browse. To post, vote, comment or report you need an account and must be {MIN_AGE} or over.</P>
      <H>3. What you may post</H>
      <P>Only information you have seen yourself and honestly believe is accurate. A claimed prior price must come with evidence (a price-history link or your own photo). Disputing a price should be based on facts, not on attacks on people or small businesses.</P>
      <P>Do not post: illegal content; defamatory claims; other people&apos;s personal data; photos of identifiable people or staff; content you do not have the right to share (including shop logos, product images or ads copied from elsewhere); spam; or false votes. Do not use several accounts to vote or report.</P>
      <H>4. Photos</H>
      <P>You may upload a photo of a shelf price tag only if you took it yourself. By uploading you confirm this and give iesales.ie a non-exclusive, free licence to display it on the site with your deal. You can delete the deal (and photo) at any time. Location data is removed from the photo before upload.</P>
      <H>5. Reporting and moderation</H>
      <P>Every deal, comment, poll and question has a Report button. Content that receives several independent reports from established accounts is hidden automatically until a person reviews it. We may also remove content or accounts that break these terms. When we hide or remove your content we will show you the reason in your profile, and you can appeal by emailing {CONTACT_EMAIL}.</P>
      <H>6. Notices of illegal content (EU Digital Services Act)</H>
      <P>As a hosting service we act on notices of illegal content. Anyone, with or without an account, can{" "}
        {onNotice ? <button className="font-semibold text-emerald-700 underline" onClick={onNotice}>submit a notice</button> : <>submit a notice (from the home page footer)</>} or email {CONTACT_EMAIL}. Please include the web address of the content and an explanation of why it is illegal. We will review notices diligently and tell the person who sent it and the person who posted the content what we decided and why.</P>
      <P>Our single point of contact for authorities and users under the Digital Services Act is {CONTACT_EMAIL}.</P>
      <H>7. Hidden content, complaints and disputes</H>
      <P>Content is hidden automatically when several reports come from established accounts. A person then reviews it, and it is restored if it does not break these terms. If you disagree with a decision, email {CONTACT_EMAIL} within 6 months and a person who was not involved in the original decision will look at it again. You may also complain to Coimisiún na Meán, Ireland&apos;s Digital Services Coordinator (cnam.ie), and you may use an out-of-court dispute settlement body certified under the Digital Services Act, or go to court.</P>
      <H>8. Shops and brands named on the site</H>
      <P>If you run a shop or brand and a post about you is wrong, email {CONTACT_EMAIL} with the post address and the correct information. We will review it promptly, and we will remove or correct posts that are inaccurate or unlawful. Prices are user-reported, so a shop&apos;s own price is always the one that counts.</P>
      <H>9. Liability</H>
      <P>We provide the site as is. We are not responsible for user content or for purchases you make. Nothing in these terms limits rights you have as a consumer or liability that cannot be excluded by law.</P>
      <H>10. Law</H>
      <P>Irish law applies, and the courts of Ireland have jurisdiction, without affecting any mandatory consumer rights you have in your country of residence.</P>
    </>
  );
}

export function PrivacyBody() {
  return (
    <>
      <p className="text-xs text-slate-500">Last updated {UPDATED}. Controller: <OperatorLine /> Contact: {CONTACT_EMAIL}.</p>
      <H>What we collect</H>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
        <li><strong>Account:</strong> your email address and a public username. If you use Google sign-in we receive your email from Google; we do not receive or store your Google password.</li>
        <li><strong>What you post:</strong> deals, photos, votes, comments, polls, questions and reports, linked to your account.</li>
        <li><strong>Technical:</strong> hosting and security logs (such as IP address) kept by our hosting providers for a short period.</li>
      </ul>
      <P>Browsing needs no account. We use no advertising, no tracking cookies and no analytics that profile you. We set only the cookies needed to keep you signed in. Your browser also stores, on your own device only, whether you dismissed the install prompt and which deals you saved. We never receive that information.</P>
      <H>Why and on what basis</H>
      <P>To run your account and show your posts (performance of the service you asked for); to keep the site safe, handle reports and prevent abuse (our legitimate interests); and to meet legal duties such as handling takedown notices.</P>
      <H>Who processes data for us</H>
      <P>Supabase (database, sign-in and photo storage) and Vercel (hosting), Google if you choose Google sign-in, and OpenRouter with its AI model provider if you use Auto-fill. For Auto-fill, only the shop link you paste, or the price-tag photo you take, is sent to be read. Never use a photo showing people or personal details, and never paste a link that contains personal details. We do not keep the page text or the AI result, only the details you choose to post. Our project is configured for EU hosting; where a provider transfers data outside the EEA this relies on approved safeguards such as standard contractual clauses.</P>
      <H>Your username and posts are public</H>
      <P>Your username, deals, photos, comments and polls are visible to anyone. Votes and reports are not shown publicly; reporters are not shown to other users.</P>
      <H>How long we keep it</H>
      <P>Until you delete it. Backups held by our database provider may keep deleted data for a limited time before it is overwritten.</P>
      <H>Your rights</H>
      <P>You can access, correct, delete, restrict or object to our use of your data, and request a copy. Use <strong>Delete my account &amp; data</strong> in your profile to erase your account, deals, photos, votes, comments, polls, questions and reports in one step. For anything else email {CONTACT_EMAIL}. You can complain to the Data Protection Commission (dataprotection.ie).</P>
      <H>Children</H>
      <P>The site is for people aged {MIN_AGE} and over. If you believe a child under {MIN_AGE} has an account, tell us and we will delete it.</P>
    </>
  );
}

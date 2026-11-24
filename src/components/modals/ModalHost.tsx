"use client";

import { useApp } from "@/lib/app-context";
import { AuthModal } from "./AuthModal";
import { PledgeModal, PrivacyModal, TermsModal } from "./LegalModals";
import { NoticeModal } from "./NoticeModal";
import { PollModal } from "./PollModal";
import { PostDealModal } from "./PostDealModal";
import { ProfileModal } from "./ProfileModal";
import { ReportModal } from "./ReportModal";

export function ModalHost() {
  const { modal, me } = useApp();
  if (!modal) return null;
  switch (modal.type) {
    case "auth": return <AuthModal />;
    case "post": return me ? <PostDealModal /> : <AuthModal />;
    case "poll": return me ? <PollModal /> : <AuthModal />;
    case "profile": return me ? <ProfileModal /> : <AuthModal />;
    case "report": return <ReportModal target={modal.target} id={modal.id} />;
    case "notice": return <NoticeModal />;
    case "pledge": return <PledgeModal />;
    case "terms": return <TermsModal />;
    case "privacy": return <PrivacyModal />;
  }
}

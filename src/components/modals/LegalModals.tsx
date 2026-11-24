"use client";

import { useApp } from "@/lib/app-context";
import { Modal } from "../Modal";
import { PledgeBody, PrivacyBody, TermsBody } from "../legal/LegalText";

export function PledgeModal() {
  const { closeModal } = useApp();
  return <Modal title="Zero-Profit Pledge" onClose={closeModal} wide><PledgeBody /></Modal>;
}

export function TermsModal() {
  const { closeModal, openModal } = useApp();
  return <Modal title="Terms & takedown policy" onClose={closeModal} wide><TermsBody onNotice={() => openModal({ type: "notice" })} /></Modal>;
}

export function PrivacyModal() {
  const { closeModal } = useApp();
  return <Modal title="Privacy policy (GDPR)" onClose={closeModal} wide><PrivacyBody /></Modal>;
}

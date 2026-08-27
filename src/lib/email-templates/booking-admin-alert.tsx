import * as React from "react";
import { Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text } from "@react-email/components";

import type { TemplateEntry } from "./registry";
import {
  button,
  container,
  detail,
  detailBox,
  footer,
  formatFrDate,
  heading,
  hr,
  LOGO_URL,
  logo,
  main,
  text,
} from "./_shared";

interface Props {
  name?: string;
  email?: string;
  slotDate?: string;
  slotTime?: string;
  locationType?: "meet" | "phone";
  phone?: string | null;
  notes?: string | null;
  guests?: string[];
  adminUrl?: string;
}

const Email = ({
  name = "",
  email = "",
  slotDate = "",
  slotTime = "",
  locationType = "meet",
  phone = null,
  notes = null,
  guests = [],
  adminUrl = "https://skalevisuals.com/office/calls",
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{`Nouveau call booké — ${name} — ${slotDate} à ${slotTime}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Skale Visuals" style={logo} />
        <Heading style={heading}>Nouveau call booké.</Heading>
        <Section style={detailBox}>
          <Text style={detail}>👤 {name}</Text>
          <Text style={detail}>✉️ {email}</Text>
          <Text style={detail}>
            📅 {formatFrDate(slotDate)} à {slotTime}
          </Text>
          <Text style={detail}>
            {locationType === "phone" ? `📞 Téléphone — ${phone || "non renseigné"}` : "🎥 Google Meet"}
          </Text>
          {guests.length > 0 ? <Text style={detail}>👥 Invités : {guests.join(", ")}</Text> : null}
        </Section>
        <Text style={text}>
          <strong>Notes :</strong> {notes || "—"}
        </Text>
        <Button href={adminUrl} style={button}>
          Ouvrir la fiche
        </Button>
        <Hr style={hr} />
        <Text style={footer}>Notification interne — Skale Visuals CRM</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Nouveau call booké — ${String(data['name'] ?? "").split(" ")[0]} — ${data['slotDate'] ?? ""} à ${data['slotTime'] ?? ""}`,
  displayName: "Notification interne — nouveau call",
  previewData: {
    name: "Julie Martin",
    email: "julie@exemple.com",
    slotDate: "2026-09-08",
    slotTime: "15:00",
    locationType: "meet",
    notes: "Besoin de shorts pour TikTok",
    guests: [],
  },
} satisfies TemplateEntry;

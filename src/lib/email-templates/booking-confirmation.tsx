import * as React from "react";
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";

import type { TemplateEntry } from "./registry";
import {
  button,
  container,
  detail,
  detailBox,
  firstName,
  footer,
  formatFrDate,
  heading,
  hr,
  logo,
  main,
  text,
} from "./_shared";

interface Props {
  name?: string;
  slotDate?: string;
  slotTime?: string;
  locationType?: "meet" | "phone";
}

const Email = ({ name, slotDate = "", slotTime = "", locationType = "meet" }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre appel avec Skale Visuals est confirmé.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>
          skale<span style={{ color: "#e11d48" }}>.</span>
        </Text>
        <Heading style={heading}>C'est confirmé.</Heading>
        <Text style={text}>Bonjour{firstName(name) ? ` ${firstName(name)}` : ""},</Text>
        <Text style={text}>
          Votre appel de consultation avec Skale Visuals est bien confirmé. Voici les détails :
        </Text>
        <Section style={detailBox}>
          <Text style={detail}>
            📅 {formatFrDate(slotDate)} à {slotTime} (heure d'Europe centrale)
          </Text>
          <Text style={detail}>⏱ 30 minutes</Text>
          <Text style={detail}>{locationType === "phone" ? "📞 Par téléphone" : "🎥 Google Meet"}</Text>
        </Section>
        {locationType === "meet" ? (
          <Text style={text}>
            Vous recevrez votre lien Google Meet dans les prochaines 24 heures. Si vous avez des questions
            en attendant, répondez simplement à cet email.
          </Text>
        ) : (
          <Text style={text}>
            Nous vous appellerons au numéro communiqué. Si vous avez des questions en attendant, répondez
            simplement à cet email.
          </Text>
        )}
        <Text style={text}>
          À très vite,
          <br />
          L'équipe Skale Visuals
        </Text>
        <Hr style={hr} />
        <Text style={footer}>skalevisuals.com</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "Votre appel avec Skale Visuals est confirmé ✓",
  displayName: "Confirmation de réservation",
  previewData: { name: "Julie Martin", slotDate: "2026-09-08", slotTime: "15:00", locationType: "meet" },
} satisfies TemplateEntry;

export const buttonStyle = button;

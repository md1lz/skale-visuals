import * as React from "react";
import { Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text } from "@react-email/components";

import type { TemplateEntry } from "./registry";
import {
  button,
  CONTACT_LINE,
  container,
  detail,
  detailBox,
  firstName,
  footer,
  heading,
  hr,
  LOGO_URL,
  logo,
  main,
  text,
} from "./_shared";

interface Props {
  name?: string;
  slotTime?: string;
  meetLink?: string | null;
  locationType?: "meet" | "phone";
}

const Email = ({ name, slotTime = "", meetLink = null, locationType = "meet" }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre appel avec Skale Visuals commence dans 1 heure.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Skale Visuals" style={logo} />
        <Heading style={heading}>Dans 1 heure.</Heading>
        <Text style={text}>Bonjour{firstName(name) ? ` ${firstName(name)}` : ""},</Text>
        <Text style={text}>Petit rappel — votre appel avec Skale Visuals commence dans 1 heure.</Text>
        <Section style={detailBox}>
          <Text style={detail}>📅 Aujourd'hui à {slotTime} (heure d'Europe centrale)</Text>
          <Text style={detail}>
            {locationType === "phone"
              ? "📞 Nous vous appellerons au numéro communiqué."
              : meetLink
                ? `🎥 Google Meet : ${meetLink}`
                : "🎥 Vous recevrez le lien très prochainement."}
          </Text>
        </Section>
        {locationType === "meet" && meetLink ? (
          <Button href={meetLink} style={button}>
            Rejoindre l'appel
          </Button>
        ) : null}
        <Text style={{ ...text, marginTop: "28px" }}>{CONTACT_LINE}</Text>
        <Text style={text}>
          À tout à l'heure,
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
  subject: "Votre appel commence dans 1 heure — Skale Visuals",
  displayName: "Rappel 1h avant",
  previewData: {
    name: "Julie Martin",
    slotTime: "15:00",
    meetLink: "https://meet.google.com/abc-defg-hij",
    locationType: "meet",
  },
} satisfies TemplateEntry;

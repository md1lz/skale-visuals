import * as React from "react";
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Text } from "@react-email/components";

import type { TemplateEntry } from "./registry";
import {
  button,
  container,
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
  meetLink?: string;
}

const Email = ({ name, slotDate = "", slotTime = "", meetLink = "" }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre lien Google Meet pour l'appel avec Skale Visuals.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>
          skale<span style={{ color: "#e11d48" }}>.</span>
        </Text>
        <Heading style={heading}>Votre lien Meet.</Heading>
        <Text style={text}>Bonjour{firstName(name) ? ` ${firstName(name)}` : ""},</Text>
        <Text style={text}>
          Voici votre lien pour rejoindre l'appel du {formatFrDate(slotDate)} à {slotTime} :
        </Text>
        {meetLink ? (
          <>
            <Text style={{ ...text, margin: "0 0 24px" }}>🎥 {meetLink}</Text>
            <Button href={meetLink} style={button}>
              Rejoindre l'appel
            </Button>
          </>
        ) : null}
        <Text style={{ ...text, marginTop: "28px" }}>
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
  subject: "Votre lien Google Meet — Skale Visuals",
  displayName: "Lien Google Meet",
  previewData: {
    name: "Julie Martin",
    slotDate: "2026-09-08",
    slotTime: "15:00",
    meetLink: "https://meet.google.com/abc-defg-hij",
  },
} satisfies TemplateEntry;

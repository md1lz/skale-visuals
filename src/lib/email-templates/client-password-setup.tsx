import * as React from "react";
import { Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Text } from "@react-email/components";

import type { TemplateEntry } from "./registry";
import { button, CONTACT_LINE, container, firstName, footer, heading, hr, LOGO_URL, logo, main, text } from "./_shared";

interface Props {
  name?: string;
  setupUrl?: string;
}

const Email = ({ name, setupUrl = "" }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Créez votre mot de passe pour accéder à votre espace client Skale Visuals.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Skale Visuals" style={logo} />
        <Heading style={heading}>Créez votre mot de passe unique.</Heading>
        <Text style={text}>Bonjour{firstName(name) ? ` ${firstName(name)}` : ""},</Text>
        <Text style={text}>
          Votre espace client Skale Visuals est prêt. Choisissez votre mot de passe pour y accéder : vous le
          saisirez deux fois pour le confirmer.
        </Text>
        {setupUrl ? (
          <Button href={setupUrl} style={button}>
            Créer mon mot de passe
          </Button>
        ) : null}
        <Text style={{ ...text, margin: "24px 0 16px" }}>
          Ce lien est valable 7 jours. Passé ce délai, demandez-nous simplement un nouveau lien.
        </Text>
        <Text style={text}>{CONTACT_LINE}</Text>
        <Hr style={hr} />
        <Text style={footer}>skalevisuals.com</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "Créez votre mot de passe — Espace client Skale Visuals",
  displayName: "Espace client — création du mot de passe",
  previewData: {
    name: "Julie Martin",
    setupUrl: "https://app.skalevisuals.com/creer-mot-de-passe?token=abc123",
  },
} satisfies TemplateEntry;

import * as React from "react";
import { Body, Container, Head, Heading, Hr, Html, Img, Preview, Text } from "@react-email/components";

import type { TemplateEntry } from "./registry";
import { CONTACT_LINE, container, detailBox, firstName, footer, heading, hr, LOGO_URL, logo, main, text } from "./_shared";

interface Props {
  name?: string;
  code?: string;
}

const codeStyle = {
  fontSize: "32px",
  fontWeight: 700,
  letterSpacing: "0.32em",
  color: "#0a0a0a",
  margin: "0",
  textAlign: "center" as const,
};

const Email = ({ name, code = "" }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre code de réinitialisation Skale Visuals.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Skale Visuals" style={logo} />
        <Heading style={heading}>Votre code de vérification.</Heading>
        <Text style={text}>Bonjour{firstName(name) ? ` ${firstName(name)}` : ""},</Text>
        <Text style={text}>
          Saisissez ce code dans votre espace client pour réinitialiser votre mot de passe.
        </Text>
        <div style={detailBox}>
          <Text style={codeStyle}>{code}</Text>
        </div>
        <Text style={{ ...text, margin: "24px 0 16px" }}>
          Ce code est valable 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail :
          votre mot de passe actuel reste valable.
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
  subject: "Votre code de réinitialisation — Skale Visuals",
  displayName: "Espace client — code de réinitialisation",
  previewData: { name: "Julie Martin", code: "482913" },
} satisfies TemplateEntry;

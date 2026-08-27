import * as React from "react";
import { Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Text } from "@react-email/components";

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
  number?: string;
  amount?: string;
  validUntil?: string;
  signUrl?: string;
}

const Email = ({ name, number = "", amount = "", validUntil = "", signUrl = "" }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre devis Skale Visuals est disponible.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Skale Visuals" style={logo} />
        <Heading style={heading}>Votre devis.</Heading>
        <Text style={text}>Bonjour{firstName(name) ? ` ${firstName(name)}` : ""},</Text>
        <Text style={text}>
          Voici votre devis {number}. Vous pouvez le consulter et le signer en ligne en un clic.
        </Text>
        <div style={detailBox}>
          <Text style={detail}>Devis {number}</Text>
          <Text style={detail}>Montant : {amount}</Text>
          {validUntil ? <Text style={detail}>Valable jusqu'au {validUntil}</Text> : null}
        </div>
        {signUrl ? (
          <Button href={signUrl} style={button}>
            Consulter et signer le devis
          </Button>
        ) : null}
        <Text style={{ ...text, marginTop: "28px" }}>{CONTACT_LINE}</Text>
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
  subject: (data: Record<string, any>) => `Votre devis ${data.number ?? ""} — Skale Visuals`,
  displayName: "Envoi de devis",
  previewData: {
    name: "Julie Martin",
    number: "DEV-2026-0084",
    amount: "250,00 €",
    validUntil: "30/09/2026",
    signUrl: "https://skalevisuals.com/sign/abc123",
  },
} satisfies TemplateEntry;

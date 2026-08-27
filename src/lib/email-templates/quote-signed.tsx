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
  signedAt?: string;
  pdfUrl?: string;
}

const Email = ({ name, number = "", amount = "", signedAt = "", pdfUrl = "" }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre devis signé Skale Visuals.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Skale Visuals" style={logo} />
        <Heading style={heading}>Devis signé.</Heading>
        <Text style={text}>Bonjour{firstName(name) ? ` ${firstName(name)}` : ""},</Text>
        <Text style={text}>
          Nous avons bien reçu votre signature. Voici le récapitulatif du devis accepté.
        </Text>
        <div style={detailBox}>
          <Text style={detail}>Devis {number}</Text>
          <Text style={detail}>Montant : {amount}</Text>
          {signedAt ? <Text style={detail}>Signé le {signedAt}</Text> : null}
        </div>
        {pdfUrl ? (
          <Button href={pdfUrl} style={button}>
            Télécharger le devis signé (PDF)
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
  subject: (data: Record<string, any>) => `Devis ${data.number ?? ""} signé — Skale Visuals`,
  displayName: "Devis signé",
  previewData: {
    name: "Julie Martin",
    number: "DEV-2026-0084",
    amount: "250,00 €",
    signedAt: "12/09/2026 à 14:32",
    pdfUrl: "https://skalevisuals.com/api/public/doc/quote/abc123",
  },
} satisfies TemplateEntry;

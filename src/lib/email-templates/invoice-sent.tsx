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
  dueAt?: string;
  pdfUrl?: string;
}

const Email = ({ name, number = "", amount = "", dueAt = "", pdfUrl = "" }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre facture Skale Visuals est disponible.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Skale Visuals" style={logo} />
        <Heading style={heading}>Votre facture.</Heading>
        <Text style={text}>Bonjour{firstName(name) ? ` ${firstName(name)}` : ""},</Text>
        <Text style={text}>Voici votre facture {number}.</Text>
        <div style={detailBox}>
          <Text style={detail}>Facture {number}</Text>
          <Text style={detail}>Montant TTC : {amount}</Text>
          {dueAt ? <Text style={detail}>Échéance : {dueAt}</Text> : null}
        </div>
        {pdfUrl ? (
          <Button href={pdfUrl} style={button}>
            Télécharger la facture (PDF)
          </Button>
        ) : null}
        <Text style={{ ...text, marginTop: "28px" }}>{CONTACT_LINE}</Text>
        <Text style={text}>
          Merci de votre confiance,
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
  subject: (data: Record<string, any>) => `Votre facture ${data.number ?? ""} — Skale Visuals`,
  displayName: "Envoi de facture",
  previewData: {
    name: "Julie Martin",
    number: "FAC-2026-0084",
    amount: "300,00 €",
    dueAt: "30/09/2026",
    pdfUrl: "https://skalevisuals.com/api/public/doc/invoice/abc123",
  },
} satisfies TemplateEntry;

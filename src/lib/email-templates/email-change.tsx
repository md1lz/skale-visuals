import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import {
  button,
  container,
  CONTACT_LINE,
  detail,
  detailBox,
  footer,
  heading,
  hr,
  LOGO_URL,
  logo,
  main,
  text,
} from "./_shared";

interface EmailChangeEmailProps {
  siteName: string;
  oldEmail: string;
  email: string;
  newEmail: string;
  confirmationUrl: string;
}

export const EmailChangeEmail = ({ oldEmail, email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirmez votre nouvelle adresse e-mail.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Skale Visuals" style={logo} />
        <Heading style={heading}>Changement d'e-mail.</Heading>
        <Text style={text}>Confirmez ce changement d'adresse pour votre compte Skale Visuals :</Text>
        <Section style={detailBox}>
          <Text style={detail}>Ancienne : {oldEmail || email}</Text>
          <Text style={detail}>Nouvelle : {newEmail || email}</Text>
        </Section>
        <Button style={button} href={confirmationUrl}>
          Confirmer le changement
        </Button>
        <Text style={{ ...text, margin: "24px 0 16px" }}>
          Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message.
        </Text>
        <Text style={text}>{CONTACT_LINE}</Text>
        <Hr style={hr} />
        <Text style={footer}>skalevisuals.com</Text>
      </Container>
    </Body>
  </Html>
);

export default EmailChangeEmail;

import * as React from "react";
import { Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Text } from "@react-email/components";

import { button, container, CONTACT_LINE, footer, heading, hr, LOGO_URL, logo, main, text } from "./_shared";

interface RecoveryEmailProps {
  siteName: string;
  confirmationUrl: string;
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Réinitialisez votre mot de passe Skale Visuals.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Skale Visuals" style={logo} />
        <Heading style={heading}>Nouveau mot de passe.</Heading>
        <Text style={text}>
          Vous avez demandé à réinitialiser votre mot de passe. Choisissez-en un nouveau via le bouton ci-dessous.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Réinitialiser mon mot de passe
        </Button>
        <Text style={{ ...text, margin: "24px 0 16px" }}>
          Si vous n'êtes pas à l'origine de cette demande, votre mot de passe actuel reste valable.
        </Text>
        <Text style={text}>{CONTACT_LINE}</Text>
        <Hr style={hr} />
        <Text style={footer}>skalevisuals.com</Text>
      </Container>
    </Body>
  </Html>
);

export default RecoveryEmail;

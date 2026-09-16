import * as React from "react";
import { Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Text } from "@react-email/components";

import { button, container, CONTACT_LINE, footer, heading, hr, LOGO_URL, logo, main, text } from "./_shared";

interface SignupEmailProps {
  siteName: string;
  siteUrl: string;
  recipient: string;
  confirmationUrl: string;
}

export const SignupEmail = ({ recipient, confirmationUrl }: SignupEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirmez votre adresse e-mail Skale Visuals.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Skale Visuals" style={logo} />
        <Heading style={heading}>Confirmez votre e-mail.</Heading>
        <Text style={text}>
          Bienvenue chez Skale Visuals. Confirmez l'adresse {recipient} pour activer votre accès.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmer mon e-mail
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

export default SignupEmail;

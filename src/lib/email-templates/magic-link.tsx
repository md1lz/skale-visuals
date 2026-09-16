import * as React from "react";
import { Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Text } from "@react-email/components";

import { button, container, CONTACT_LINE, footer, heading, hr, LOGO_URL, logo, main, text } from "./_shared";

interface MagicLinkEmailProps {
  siteName: string;
  confirmationUrl: string;
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre lien de connexion Skale Visuals.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Skale Visuals" style={logo} />
        <Heading style={heading}>Votre lien de connexion.</Heading>
        <Text style={text}>Cliquez sur le bouton ci-dessous pour vous connecter. Ce lien est valable une seule fois.</Text>
        <Button style={button} href={confirmationUrl}>
          Se connecter
        </Button>
        <Text style={{ ...text, margin: "24px 0 16px" }}>
          Si vous n'avez pas demandé ce lien, ignorez simplement ce message.
        </Text>
        <Text style={text}>{CONTACT_LINE}</Text>
        <Hr style={hr} />
        <Text style={footer}>skalevisuals.com</Text>
      </Container>
    </Body>
  </Html>
);

export default MagicLinkEmail;

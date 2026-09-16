import * as React from "react";
import { Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Text } from "@react-email/components";

import { button, container, CONTACT_LINE, footer, heading, hr, LOGO_URL, logo, main, text } from "./_shared";

interface InviteEmailProps {
  siteName: string;
  siteUrl: string;
  confirmationUrl: string;
}

export const InviteEmail = ({ siteName, confirmationUrl }: InviteEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Vous êtes invité à rejoindre Skale Visuals.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Skale Visuals" style={logo} />
        <Heading style={heading}>Vous êtes invité.</Heading>
        <Text style={text}>
          Vous avez été invité à rejoindre {siteName}. Acceptez l'invitation pour créer votre accès.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Accepter l'invitation
        </Button>
        <Text style={{ ...text, margin: "24px 0 16px" }}>
          Si cette invitation ne vous concerne pas, ignorez simplement ce message.
        </Text>
        <Text style={text}>{CONTACT_LINE}</Text>
        <Hr style={hr} />
        <Text style={footer}>skalevisuals.com</Text>
      </Container>
    </Body>
  </Html>
);

export default InviteEmail;

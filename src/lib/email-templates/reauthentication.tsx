import * as React from "react";
import { Body, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text } from "@react-email/components";

import { container, CONTACT_LINE, detailBox, footer, heading, hr, LOGO_URL, logo, main, text } from "./_shared";

interface ReauthenticationEmailProps {
  token: string;
}

const code = {
  fontSize: "30px",
  fontWeight: 700,
  letterSpacing: "0.18em",
  color: "#0a0a0a",
  margin: "0",
  textAlign: "center" as const,
};

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre code de vérification Skale Visuals.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Skale Visuals" style={logo} />
        <Heading style={heading}>Votre code de vérification.</Heading>
        <Text style={text}>Saisissez ce code pour confirmer votre identité :</Text>
        <Section style={detailBox}>
          <Text style={code}>{token}</Text>
        </Section>
        <Text style={{ ...text, margin: "0 0 16px" }}>
          Ce code expire rapidement. Si vous ne l'avez pas demandé, ignorez ce message.
        </Text>
        <Text style={text}>{CONTACT_LINE}</Text>
        <Hr style={hr} />
        <Text style={footer}>skalevisuals.com</Text>
      </Container>
    </Body>
  </Html>
);

export default ReauthenticationEmail;

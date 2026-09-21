import React from "react";

import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email";

import { Footer } from "./shared/footer";

export default function AgreementSigned({
  agreementName = "Standard NDA",
  signerName,
  signerEmail,
  recipientRole = "team",
}: {
  agreementName: string;
  signerName?: string | null;
  signerEmail?: string | null;
  recipientRole?: "team" | "signer";
}) {
  const signerLabel = signerName || signerEmail || "the signer";

  return (
    <Html>
      <Head />
      <Preview>
        {recipientRole === "signer"
          ? `your signed copy of ${agreementName}`
          : `${signerLabel} signed ${agreementName}`}
      </Preview>
      <Tailwind>
        <Body
          className="mx-auto my-auto bg-white"
          style={{
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          }}
        >
          <Container className="mx-auto my-10 w-[465px] p-5">
            <Text className="mx-0 mb-8 mt-4 p-0 text-center text-xl font-semibold lowercase tracking-tight text-[#242424]">
              mimosa
            </Text>
            <Text className="mx-0 my-7 p-0 text-center text-lg font-semibold text-[#242424]">
              {recipientRole === "signer"
                ? "your copy, signed"
                : "an agreement was signed"}
            </Text>
            <Text className="text-sm leading-6 text-[#242424]">
              {recipientRole === "signer" ? (
                <>
                  Attached is your signed copy of{" "}
                  <span className="font-semibold">{agreementName}</span>,
                  with the signing certificate included as proof for your
                  records.
                </>
              ) : (
                <>
                  <span className="font-semibold">{signerLabel}</span> just
                  signed{" "}
                  <span className="font-semibold">{agreementName}</span>. The
                  signed copy, with its signing certificate, is attached for
                  your records.
                </>
              )}
            </Text>
            <Section className="my-6" />
            <Footer />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

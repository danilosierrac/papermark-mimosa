import React from "react";

import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email";

import { Footer } from "./shared/footer";

export default function ViewedDocument({
  documentId = "123",
  documentName = "Pitchdeck",
  linkName = "Pitchdeck",
  viewerEmail,
  locationString,
}: {
  documentId: string;
  documentName: string;
  linkName: string;
  viewerEmail: string | null;
  locationString?: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>someone opened {documentName}</Preview>
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
              a document was opened
            </Text>
            <Text className="text-sm leading-6 text-[#242424]">
              <span className="font-semibold">{documentName}</span> was just
              viewed by{" "}
              <span className="font-semibold">
                {viewerEmail ? `${viewerEmail}` : `someone`}
              </span>
              {locationString ? (
                <span>
                  {" "}
                  in <span className="font-semibold">{locationString}</span>
                </span>
              ) : null}{" "}
              from the link <span className="font-semibold">{linkName}</span>.
            </Text>
            <Section className="my-8 text-center">
              <Button
                className="rounded bg-[#242424] text-center text-xs font-semibold text-white no-underline"
                href={`https://docs.mimosa.computer/documents/${documentId}`}
                style={{ padding: "12px 20px" }}
              >
                view document insights
              </Button>
            </Section>
            <Footer
              footerText={
                <>
                  to stop email notifications for this link, edit it and
                  uncheck &quot;receive email notification&quot;.
                </>
              }
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

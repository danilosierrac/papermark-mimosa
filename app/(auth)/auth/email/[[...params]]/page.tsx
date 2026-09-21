import { Metadata } from "next";

import EmailVerificationClient from "./page-client";

const data = {
  description: "Verify your login",
  title: "Verify login · mimosa",
  url: "/auth/email",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://docs.mimosa.computer"),
  title: data.title,
  description: data.description,
  icons: { icon: "/_static/favicon.svg" },
  openGraph: {
    title: data.title,
    description: data.description,
    url: data.url,
    siteName: "mimosa",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: data.title,
    description: data.description,
  },
};

export default async function EmailVerificationPage() {
  return <EmailVerificationClient />;
}

import { Metadata } from "next";

import LoginClient from "./page-client";

const data = {
  description: "Sign in to mimosa docs",
  title: "Sign in · mimosa",
  url: "/login",
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

export default function LoginPage() {
  return <LoginClient />;
}

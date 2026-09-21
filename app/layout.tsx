import { Metadata } from "next";

import "@/styles/globals.css";

const data = {
  description: "Share documents, the mimosa way.",
  title: "mimosa docs",
  url: "/",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-brand">{children}</body>
    </html>
  );
}

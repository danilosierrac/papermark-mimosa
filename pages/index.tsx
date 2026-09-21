import { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";

import { getServerSession } from "next-auth";

import { authOptions } from "./api/auth/[...nextauth]";

export const getServerSideProps: GetServerSideProps = async ({
  req,
  res,
}) => {
  const session = await getServerSession(req, res, authOptions);
  if (session) {
    return { redirect: { destination: "/dashboard", permanent: false } };
  }
  return { props: {} };
};

export default function Home() {
  return (
    <>
      <Head>
        <title>mimosa docs</title>
      </Head>
      <div className="flex h-screen w-full flex-col items-center justify-center bg-black px-4">
        <div className="flex w-full max-w-sm flex-col items-center text-center">
          <img
            src="/_static/mimosa-logo-white.png"
            alt="mimosa"
            className="h-8 w-auto"
          />
          <p className="mt-6 text-sm text-gray-400">
            This is where mimosa shares documents with clients.
          </p>
          <a
            href="https://mimosaagency.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 text-sm text-gray-400 underline hover:text-gray-200"
          >
            mimosaagency.com
          </a>
          <Link
            href="/login"
            className="mt-10 w-full rounded-[4px] bg-gray-100 px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-white"
          >
            Sign in
          </Link>
        </div>
      </div>
    </>
  );
}

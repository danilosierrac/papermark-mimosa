"use client";

import { useSearchParams } from "next/navigation";

import { useState } from "react";

import { signIn } from "next-auth/react";
import { toast } from "sonner";

export default function Login() {
  const searchParams = useSearchParams();
  const next = searchParams?.get("next") ?? undefined;

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    signIn("internal-password", {
      password,
      redirect: false,
      ...(next && next.length > 0 ? { callbackUrl: next } : {}),
    }).then((res) => {
      setLoading(false);
      if (res?.ok && !res?.error) {
        window.location.href = next || "/dashboard";
      } else {
        toast.error("Wrong password");
      }
    });
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-black px-4">
      <div className="flex w-full max-w-xs flex-col items-center">
        <img
          src="/_static/mimosa-logo-white.png"
          alt="mimosa"
          className="h-8 w-auto"
        />

        <form onSubmit={handleSubmit} className="mt-10 w-full space-y-3">
          <input
            autoFocus
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-[4px] border border-gray-700 bg-transparent px-4 py-3 text-center text-white placeholder:text-gray-500 focus:border-gray-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!password || loading}
            className="w-full rounded-[4px] bg-gray-100 px-4 py-3 font-medium text-black transition-colors hover:bg-white disabled:opacity-50"
          >
            {loading ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}

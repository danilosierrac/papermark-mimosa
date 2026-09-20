import Link from "next/link";
import { useRouter } from "next/router";

import { useState } from "react";

import {
  ContactIcon,
  FolderIcon,
  HouseIcon,
  MoreHorizontalIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { MobileMoreMenu } from "./mobile-more-menu";
import { MobileShareFab } from "./mobile-share-fab";

export function MobileBottomNav() {
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (match: string) => router.pathname.includes(match);

  const moreIsActive = !["dashboard", "documents", "visitors"].some((m) =>
    isActive(m),
  );

  const tabClass = (active: boolean) =>
    cn(
      "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors",
      active
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 touch-manipulation border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)] [-webkit-tap-highlight-color:transparent] md:hidden">
        <div className="flex min-h-[4.5rem] items-end justify-between gap-0.5 px-0.5">
          <Link href="/dashboard" className={tabClass(isActive("dashboard"))}>
            <HouseIcon className="h-6 w-6" />
            <span>Dashboard</span>
          </Link>
          <Link href="/documents" className={tabClass(isActive("documents"))}>
            <FolderIcon className="h-6 w-6" />
            <span>Documents</span>
          </Link>
          <div className="flex w-12 shrink-0 items-center justify-center self-center">
            <MobileShareFab />
          </div>
          <Link href="/visitors" className={tabClass(isActive("visitors"))}>
            <ContactIcon className="h-6 w-6" />
            <span>Visitors</span>
          </Link>
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={tabClass(moreIsActive)}
          >
            <MoreHorizontalIcon className="h-6 w-6" />
            <span>More</span>
          </button>
        </div>
      </nav>

      <MobileMoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}

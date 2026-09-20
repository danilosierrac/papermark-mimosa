"use client";

import Link from "next/link";

import { NavUser } from "@/components/sidebar/nav-user";
import { SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";

import { AppSidebarContent } from "./app-sidebar";

function SidebarBrandHeader() {
  return (
    <SidebarHeader className="gap-y-0 pb-4">
      <p className="hidden w-full justify-center text-2xl font-bold tracking-tighter text-black group-data-[collapsible=icon]:inline-flex dark:text-white">
        <Link href="/dashboard">P</Link>
      </p>
      <p className="ml-2 flex items-center text-2xl font-bold tracking-tighter text-black group-data-[collapsible=icon]:hidden dark:text-white">
        <Link href="/dashboard">Papermark</Link>
      </p>
    </SidebarHeader>
  );
}

export function SidebarPanels() {
  return (
    <div className="flex h-full flex-col">
      <SidebarBrandHeader />
      <AppSidebarContent />
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </div>
  );
}

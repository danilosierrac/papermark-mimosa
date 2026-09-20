"use client";

import { useRouter } from "next/router";

import * as React from "react";
import { useEffect, useState } from "react";

import { TeamContextType, initialState, useTeam } from "@/context/team-context";
import Cookies from "js-cookie";
import {
  CogIcon,
  ContactIcon,
  FolderIcon,
  HouseIcon,
  Loader,
} from "lucide-react";

import { useSlackIntegration } from "@/lib/swr/use-slack-integration";

import { NavMain } from "@/components/sidebar/nav-main";
import { TeamSwitcher } from "@/components/sidebar/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import SlackBanner from "./banners/slack-banner";

export function AppSidebarContent() {
  const router = useRouter();
  const [showSlackBanner, setShowSlackBanner] = useState<boolean | null>(null);
  const { currentTeam, teams, setCurrentTeam, isLoading }: TeamContextType =
    useTeam() || initialState;

  // Check Slack integration status
  const { integration: slackIntegration } = useSlackIntegration({
    enabled: !!currentTeam?.id,
  });

  useEffect(() => {
    if (Cookies.get("hideSlackBanner") !== "slack-banner") {
      setShowSlackBanner(true);
    } else {
      setShowSlackBanner(false);
    }
  }, []);

  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: HouseIcon,
      current: router.pathname.includes("dashboard"),
    },
    {
      title: "All Documents",
      url: "/documents",
      icon: FolderIcon,
      current: router.pathname.includes("documents"),
    },
    {
      title: "Visitors",
      url: "/visitors",
      icon: ContactIcon,
      current: router.pathname.includes("visitors"),
    },
    {
      title: "Settings",
      url: "/settings/general",
      icon: CogIcon,
      isActive:
        router.pathname.includes("settings") &&
        !router.pathname.includes("documents"),
      items: [
        {
          title: "General",
          url: "/settings/general",
          current: router.pathname.includes("settings/general"),
        },
        {
          title: "Team",
          url: "/settings/people",
          current: router.pathname.includes("settings/people"),
        },
        {
          title: "Domains",
          url: "/settings/domains",
          current: router.pathname.includes("settings/domains"),
        },
        {
          title: "Notifications",
          url: "/settings/notifications",
          current: router.pathname.includes("settings/notifications"),
        },
        {
          title: "Slack",
          url: "/settings/slack",
          current: router.pathname.includes("settings/slack"),
        },
        {
          title: "Webhooks",
          url: "/settings/webhooks",
          current: router.pathname.includes("settings/webhooks"),
        },
        {
          title: "API Keys",
          url: "/settings/tokens",
          current: router.pathname.includes("settings/tokens"),
        },
      ],
    },
  ];

  return (
    <>
      <SidebarHeader className="gap-y-0 pt-0">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm">
            <Loader className="h-5 w-5 animate-spin" /> Loading teams...
          </div>
        ) : (
          <TeamSwitcher
            currentTeam={currentTeam}
            teams={teams}
            setCurrentTeam={setCurrentTeam}
          />
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu className="group-data-[collapsible=icon]:hidden">
          <SidebarMenuItem>
            {!slackIntegration && showSlackBanner ? (
              <SlackBanner setShowSlackBanner={setShowSlackBanner} />
            ) : null}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      className="bg-gray-50 dark:bg-black"
      sidebarClassName="bg-gray-50 dark:bg-black"
      side="left"
      variant="inset"
      collapsible="icon"
      {...props}
    >
      <AppSidebarContent />
    </Sidebar>
  );
}

"use client";

import { useRouter } from "next/router";

import { useCallback, useEffect, useState } from "react";

import { LinkType } from "@prisma/client";
import { FileTextIcon, Link2Icon, XIcon } from "lucide-react";
import useSWR from "swr";

import { useTeam } from "@/context/team-context";
import { DocumentWithLinksAndLinkCountAndViewCount } from "@/lib/types";
import { cn, fetcher } from "@/lib/utils";

import LinkSheet from "@/components/links/link-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function MobileShareFab() {
  const router = useRouter();
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const [docLinkOpen, setDocLinkOpen] = useState(false);
  const [pickedDocumentId, setPickedDocumentId] = useState<string | null>(null);
  const [docSearch, setDocSearch] = useState("");
  const [debouncedDocSearch, setDebouncedDocSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedDocSearch(docSearch), 300);
    return () => clearTimeout(t);
  }, [docSearch]);

  useEffect(() => {
    if (!docLinkOpen) {
      setPickedDocumentId(null);
    }
  }, [docLinkOpen]);

  const documentsUrl =
    teamId && docPickerOpen
      ? `/api/teams/${teamId}/documents?sort=createdAt&page=1&limit=25${
          debouncedDocSearch
            ? `&query=${encodeURIComponent(debouncedDocSearch)}`
            : ""
        }`
      : null;

  const { data: docListData, isLoading: docListLoading } = useSWR<{
    documents: DocumentWithLinksAndLinkCountAndViewCount[];
  }>(documentsUrl, fetcher, { keepPreviousData: true });

  const documents = docListData?.documents ?? [];

  const handlePickDocument = (id: string) => {
    setPickedDocumentId(id);
    setDocPickerOpen(false);
    setDocLinkOpen(true);
  };

  const afterDocumentLinkCreated = useCallback(
    (id: string) => {
      setDocLinkOpen(false);
      void router.push(`/documents/${id}`);
    },
    [router],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setDocPickerOpen(true)}
        aria-label="Create share link"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-white shadow-md ring-4 ring-background [-webkit-tap-highlight-color:transparent] touch-manipulation dark:ring-background"
      >
        <Link2Icon className="h-5 w-5" strokeWidth={2.25} />
      </button>

      <Sheet open={docPickerOpen} onOpenChange={setDocPickerOpen}>
        <SheetContent
          side="bottom"
          className="flex max-h-[85dvh] flex-col rounded-t-xl border-t px-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden"
        >
          <SheetHeader className="space-y-3 px-4 text-left">
            <div className="flex items-center justify-between gap-2">
              <SheetTitle>Choose document</SheetTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => setDocPickerOpen(false)}
              >
                <XIcon className="h-5 w-5" />
              </Button>
            </div>
            <Input
              placeholder="Search documents…"
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              className="bg-muted/50"
            />
          </SheetHeader>
          <ScrollArea className="mt-2 min-h-0 flex-1 px-2">
            <div className="space-y-0.5 pb-4">
              {docListLoading && !documents.length ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Loading…
                </p>
              ) : documents.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No documents found.
                </p>
              ) : (
                documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => handlePickDocument(doc.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors",
                      "hover:bg-muted",
                    )}
                  >
                    <FileTextIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {doc.name}
                    </span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {pickedDocumentId ? (
        <LinkSheet
          isOpen={docLinkOpen}
          setIsOpen={setDocLinkOpen}
          linkType={LinkType.DOCUMENT_LINK}
          linkTargetId={pickedDocumentId}
          onLinkCreatedNavigate={afterDocumentLinkCreated}
        />
      ) : null}
    </>
  );
}

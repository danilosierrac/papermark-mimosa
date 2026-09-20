import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/router";

import { useTeam } from "@/context/team-context";
import { FileTextIcon } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";
import useSWR from "swr";

import { useAnalytics } from "@/lib/analytics";
import { LinkWithViews } from "@/lib/types";
import { fetcher } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SingleSelect } from "@/components/ui/single-select";

type DocumentOption = { id: string; name: string };

// Case-insensitive, digit-aware ordering so names like "File 2" sort before
// "File 10" and casing doesn't split the list into two alphabetical runs.
const byName: Intl.CollatorOptions = { sensitivity: "base", numeric: true };

function TransferLinkModal({
  showTransferLinkModal,
  setShowTransferLinkModal,
  link,
}: {
  showTransferLinkModal: boolean;
  setShowTransferLinkModal: Dispatch<SetStateAction<boolean>>;
  link: LinkWithViews | null;
}) {
  const router = useRouter();
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;
  const analytics = useAnalytics();

  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [transferring, setTransferring] = useState<boolean>(false);

  const currentTargetId = link?.documentId ?? "";

  useEffect(() => {
    if (showTransferLinkModal) {
      setSelectedTarget("");
    }
  }, [showTransferLinkModal, link?.id]);

  // Documents are fetched on demand (only while the modal is open) to keep
  // the picker scoped to documents the current team/member can access.
  const { data: documentsData, isLoading: documentsLoading } = useSWR<{
    documents: DocumentOption[];
  }>(
    showTransferLinkModal && teamId
      ? `/api/teams/${teamId}/documents?sort=name&limit=1000`
      : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  );

  const documentOptions = useMemo(() => {
    const docs = documentsData?.documents ?? [];
    return docs
      .map((doc) => ({
        label: doc.name,
        value: doc.id,
        searchableText: doc.name,
        meta: { isCurrent: doc.id === currentTargetId },
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, byName));
  }, [documentsData, currentTargetId]);

  const isNoop = selectedTarget === currentTargetId;
  const canSubmit = !!selectedTarget && !isNoop && !transferring;

  async function transferLink() {
    if (!link || !teamId || !selectedTarget) return;

    setTransferring(true);
    try {
      const response = await fetch(`/api/links/${link.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          targetType: "DOCUMENT",
          targetId: selectedTarget,
        }),
      });

      if (!response.ok) {
        const { error } = await response.json().catch(() => ({
          error: "Failed to transfer link",
        }));
        throw new Error(error || "Failed to transfer link");
      }

      analytics.capture("Link Transferred", {
        teamId,
        linkId: link.id,
        fromType: "DOCUMENT",
        toType: "DOCUMENT",
        fromTargetId: currentTargetId,
        toTargetId: selectedTarget,
      });

      // The transfer has committed server-side, so the modal should close on
      // success regardless of whether the cache refresh below succeeds.
      setShowTransferLinkModal(false);

      const revalidationKeys = [
        `/api/teams/${teamId}/documents/${encodeURIComponent(currentTargetId)}/links`,
        `/api/teams/${teamId}/documents/${encodeURIComponent(selectedTarget)}/links`,
      ];
      await Promise.allSettled(revalidationKeys.map((key) => mutate(key)));
    } finally {
      setTransferring(false);
    }
  }

  if (!link) return null;

  const linkName = link.name || `Link #${link.id.slice(-5)}`;
  const viewCount = link._count?.views ?? 0;

  return (
    <Dialog open={showTransferLinkModal} onOpenChange={setShowTransferLinkModal}>
      <DialogContent className="max-w-[90vw] sm:max-w-[480px]">
        <DialogHeader className="text-start">
          <DialogTitle>Transfer link</DialogTitle>
          <DialogDescription>
            Move{" "}
            <span className="font-medium text-foreground">{linkName}</span> to a
            different document. The link URL stays the same.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <SingleSelect
            options={documentOptions}
            value={selectedTarget}
            onValueChange={setSelectedTarget}
            loading={documentsLoading}
            placeholder="Select a document"
            searchPlaceholder="Search documents..."
            triggerIcon={
              <FileTextIcon className="!size-4 shrink-0 text-muted-foreground" />
            }
            emptyText="No documents found."
            renderOption={(option) => (
              <span className="flex w-full items-center gap-1.5">
                <span className="truncate">
                  {option.label}
                  {option.meta?.isCurrent ? " (current)" : ""}
                </span>
              </span>
            )}
          />

          {isNoop && selectedTarget ? (
            <p className="text-xs text-destructive">
              The link already points to this document.
            </p>
          ) : null}

          <div className="rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            <p>
              The link&apos;s existing{" "}
              <strong>
                {viewCount} view{viewCount !== 1 ? "s" : ""}
              </strong>{" "}
              stay attached to the previous document for historical analytics.
              Going forward, visitors will see the new target.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={async () => {
              const destinationId = selectedTarget;
              try {
                await transferLink();
                toast.success("Link transferred successfully!", {
                  action: {
                    label: "Open",
                    onClick: () => router.push(`/documents/${destinationId}`),
                  },
                });
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Failed to transfer",
                );
              }
            }}
            loading={transferring}
            disabled={!canSubmit}
            className="w-full"
          >
            Transfer link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useTransferLinkModal({
  link,
}: {
  link: LinkWithViews | null;
  targetType?: "DOCUMENT" | "DATAROOM";
}) {
  const [showTransferLinkModal, setShowTransferLinkModal] = useState(false);

  const TransferLinkModalCallback = useCallback(() => {
    return (
      <TransferLinkModal
        showTransferLinkModal={showTransferLinkModal}
        setShowTransferLinkModal={setShowTransferLinkModal}
        link={link}
      />
    );
  }, [showTransferLinkModal, link]);

  return useMemo(
    () => ({
      setShowTransferLinkModal,
      TransferLinkModal: TransferLinkModalCallback,
    }),
    [setShowTransferLinkModal, TransferLinkModalCallback],
  );
}

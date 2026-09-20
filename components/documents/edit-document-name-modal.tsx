import { useRouter } from "next/router";

import { useState } from "react";

import { useTeam } from "@/context/team-context";
import { toast } from "sonner";
import { mutate } from "swr";
import { z } from "zod";

import { DocumentWithLinksAndLinkCountAndViewCount } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function updateDocNameInTeamDocuments(
  data:
    | DocumentWithLinksAndLinkCountAndViewCount[]
    | {
        documents: DocumentWithLinksAndLinkCountAndViewCount[];
        [key: string]: unknown;
      }
    | undefined,
  docId: string,
  newName: string,
) {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map((doc) =>
      doc.id === docId ? { ...doc, name: newName } : doc,
    );
  }

  if (data.documents) {
    return {
      ...data,
      documents: data.documents.map((doc) =>
        doc.id === docId ? { ...doc, name: newName } : doc,
      ),
    };
  }

  return data;
}

async function parseRenameErrorMessage(response: Response) {
  const fallback = "Failed to update document name";
  const raw = await response.text();
  if (!raw) return fallback;

  try {
    const data = JSON.parse(raw) as { error?: string; message?: string };
    return data.error || data.message || fallback;
  } catch {
    return raw;
  }
}

const editDocumentNameSchema = z.object({
  name: z
    .string()
    .min(1, {
      message: "Please provide a document name.",
    })
    .max(255, {
      message: "Document name is too long.",
    }),
});

export function EditDocumentNameModal({
  open,
  setOpen,
  documentId,
  documentName,
  dataroomId,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  documentId: string;
  documentName: string;
  dataroomId?: string;
}) {
  const [name, setName] = useState<string>(documentName);
  const [loading, setLoading] = useState<boolean>(false);

  const teamInfo = useTeam();
  const router = useRouter();
  const currentFolderPath = router.query.name as string[] | undefined;
  const searchQuery = router.query.search;
  const sortQuery = router.query.sort;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const trimmedName = name.trim();
    const validation = editDocumentNameSchema.safeParse({ name: trimmedName });
    if (!validation.success) {
      return toast.error(validation.error.errors[0].message);
    }

    setLoading(true);

    const teamId = teamInfo?.currentTeam?.id;
    if (!teamId) {
      setLoading(false);
      toast.error("Team not found");
      return;
    }

    try {
      const response = await fetch(
        `/api/teams/${teamId}/documents/${documentId}/update-name`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: trimmedName,
          }),
        },
      );

      if (!response.ok) {
        toast.error(await parseRenameErrorMessage(response));
        return;
      }

      toast.success("Document name updated successfully!");

      const encodedDocumentId = encodeURIComponent(documentId);

      mutate(`/api/teams/${teamId}/documents/${encodedDocumentId}`);
      mutate(`/api/teams/${teamId}/documents/${encodedDocumentId}/overview`);

      const page = Number(router.query.page) || 1;
      const pageSize = Number(router.query.limit) || 10;
      const queryParts: string[] = [];
      if (searchQuery) queryParts.push(`query=${searchQuery}`);
      if (sortQuery) queryParts.push(`sort=${sortQuery}`);
      if (searchQuery || sortQuery) {
        queryParts.push(`page=${page}&limit=${pageSize}`);
      }
      const queryString =
        queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

      if (currentFolderPath?.length) {
        mutate(
          `/api/teams/${teamId}/folder-documents/${currentFolderPath.join("/")}`,
          null,
          {
            populateCache: (_result, data) =>
              updateDocNameInTeamDocuments(data, documentId, trimmedName),
            revalidate: false,
          },
        );
      } else {
        mutate(`/api/teams/${teamId}/documents${queryString}`, null, {
          populateCache: (_result, data) =>
            updateDocNameInTeamDocuments(data, documentId, trimmedName),
          revalidate: false,
        });
      }


      setOpen(false);
    } catch {
      toast.error("Error updating document name. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="text-start">
          <DialogTitle>Rename Document</DialogTitle>
          <DialogDescription>Enter a new document name.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Label htmlFor="document-name-update" className="opacity-80">
            Document Name
          </Label>
          <Input
            id="document-name-update"
            value={name}
            placeholder="document-name"
            className="mb-4 mt-1 w-full"
            onChange={(e) => setName(e.target.value)}
          />
          <DialogFooter>
            <Button type="submit" className="h-9 w-full" loading={loading}>
              Update name
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

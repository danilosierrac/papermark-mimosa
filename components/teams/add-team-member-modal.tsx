import { useRouter } from "next/router";

import { useEffect, useRef, useState } from "react";

import { useTeam } from "@/context/team-context";
import { InfoIcon } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";
import { z } from "zod";

import { useAnalytics } from "@/lib/analytics";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BadgeTooltip } from "@/components/ui/tooltip";

type InviteRole = "ADMIN" | "MANAGER" | "MEMBER";

export function AddTeamMembers({
  open,
  setOpen,
  children,
  defaultRole = "MEMBER",
  redirectToPeople = true,
  onInvited,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  children?: React.ReactNode;
  /** Preselect a role (still editable). Defaults to "MEMBER". */
  defaultRole?: InviteRole;
  /** Redirect to /settings/people after a successful invite. Defaults to true. */
  redirectToPeople?: boolean;
  /** Called after a successful invite (e.g. to revalidate a list). */
  onInvited?: () => void;
}) {
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<InviteRole>(defaultRole);
  const [loading, setLoading] = useState<boolean>(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;
  const analytics = useAnalytics();
  const router = useRouter();

  // Reset to the preselected values each time the modal opens.
  useEffect(() => {
    if (open) {
      setEmail("");
      setRole(defaultRole);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const emailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .min(3, { message: "Please enter a valid email." })
    .email({ message: "Please enter a valid email." });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    const response = await fetch(`/api/teams/${teamId}/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: validation.data,
        role,
        dataroomIds: [],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      setLoading(false);
      setOpen(false);
      toast.error(error);
      return;
    }

    analytics.capture("Team Member Invitation Sent", {
      email: validation.data,
      teamId: teamId,
    });

    mutate(`/api/teams/${teamId}/invitations`);
    mutate(`/api/teams/${teamId}/limits`);

    toast.success("An invitation email has been sent!");
    setOpen(false);
    setLoading(false);

    onInvited?.();

    if (redirectToPeople) {
      router.push("/settings/people");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent
        className="sm:max-w-[425px]"
        onOpenAutoFocus={(event) => {
          // The info button is the first focusable element in the dialog, and
          // Radix tooltips open on focus — without this the tooltip pops open
          // on its own every time the modal is launched.
          event.preventDefault();
          emailInputRef.current?.focus();
        }}
      >
        <DialogHeader className="text-start">
          <DialogTitle>Add Member</DialogTitle>
          <DialogDescription>
            You can easily add team members.{" "}
            <BadgeTooltip
              side="bottom"
              align="start"
              className="max-w-xs text-left"
              content={
                <div className="space-y-1.5">
                  <p>
                    <span className="font-medium text-foreground">Members</span>{" "}
                    join your team and can edit and manage documents and links.
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      Visitors
                    </span>{" "}
                    are people you share links with. They only get view access.
                  </p>
                </div>
              }
            >
              <button
                type="button"
                aria-label="Learn about members and visitors"
                className="inline-flex translate-y-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <InfoIcon className="size-3.5" />
              </button>
            </BadgeTooltip>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="email" className="opacity-80">
              Email
            </Label>
            <Input
              id="email"
              ref={emailInputRef}
              placeholder="team@member.com"
              className="w-full"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="role" className="opacity-80">
              Role
            </Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as InviteRole)}
            >
              <SelectTrigger id="role" className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="MEMBER">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="mt-2">
            <Button type="submit" className="h-9 w-full">
              {loading ? "Sending email..." : "Add member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

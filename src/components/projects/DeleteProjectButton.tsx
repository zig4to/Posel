"use client";

import { useTransition } from "react";
import Button from "@/components/ui/Button";
import { deleteProjectAction } from "@/actions/projects";

export default function DeleteProjectButton({
  projectId,
  className,
}: {
  projectId: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="dangerSoft"
      className={className}
      disabled={pending}
      onClick={() => {
        if (!confirm("Izbriši ta projekt?")) {
          return;
        }
        startTransition(() => {
          deleteProjectAction(projectId);
        });
      }}
    >
      {pending ? "Brišem …" : "Izbriši"}
    </Button>
  );
}

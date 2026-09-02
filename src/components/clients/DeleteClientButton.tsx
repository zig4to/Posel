"use client";

import { useTransition } from "react";
import Button from "@/components/ui/Button";
import { deleteClientAction } from "@/actions/clients";

export default function DeleteClientButton({ clientId }: { clientId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            "Izbriši tega partnerja? S tem se izbrišejo tudi vsi njegovi delovni vnosi v koledarju in vsi njegovi projekti v zavihku Projekti."
          )
        ) {
          return;
        }
        startTransition(() => {
          deleteClientAction(clientId);
        });
      }}
    >
      {pending ? "Brišem …" : "Izbriši partnerja"}
    </Button>
  );
}

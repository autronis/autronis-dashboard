"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Direct /projecten/[id] route — redirects to /klanten/[klantId]/projecten/[id]
export default function ProjectRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Fetch the project to get klantId, then redirect
    fetch(`/api/projecten`)
      .then((res) => res.json())
      .then((data: { projecten?: Array<{ id: number; klantId: number | null }> }) => {
        const project = data.projecten?.find((p) => p.id === projectId);
        if (project?.klantId) {
          router.replace(`/klanten/${project.klantId}/projecten/${projectId}`);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true));
  }, [projectId, router]);

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-autronis-text-secondary text-lg">Project niet gevonden</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-autronis-accent" />
    </div>
  );
}

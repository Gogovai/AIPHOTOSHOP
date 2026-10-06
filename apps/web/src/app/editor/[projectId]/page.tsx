import type { Metadata } from "next";

import { EditorShell } from "@/components/editor/editor-shell";
import { documentService } from "@/lib/document-service";

interface EditorPageProps {
  readonly params: Promise<{ projectId: string }>;
}

/**
 * The editor route must be dynamic: it depends on server-side persistence state
 * (the in-memory repository during development, Supabase in production). Static
 * prerendering would hit an empty repository at build time.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AIPHOTOSHOP — Editor",
};

/**
 * The editor route loads a real persisted document from the repository.
 *
 * For now the repository is in-memory (Supabase is not connected in this
 * environment). The route stays a server component; interactivity lives inside
 * the shell's client islands.
 */
export default async function EditorPage({ params }: EditorPageProps) {
  const { projectId } = await params;
  const { document, revisionId } = await documentService.loadOrCreate(projectId);

  return <EditorShell projectId={projectId} revisionId={revisionId} document={document} />;
}

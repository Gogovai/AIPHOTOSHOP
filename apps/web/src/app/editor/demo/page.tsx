import type { Metadata } from "next";

import { EditorShell } from "@/components/editor/editor-shell";
import { documentService } from "@/lib/document-service";

/**
 * The demo editor route must be dynamic: it depends on server-side persistence
 * state. Static prerendering would hit an empty repository at build time.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AIPHOTOSHOP — Editor (Demo)",
};

/**
 * The demo editor route loads the development document, creating it with a
 * starter layer tree the first time it is opened.
 *
 * This is the development path for Milestone 004: it proves that the editor can
 * create a valid DesignDocument through the repository, populate it with a real
 * layer tree, persist it as a revision, and hand it to the shell. A real user
 * would create documents through an explicit "New document" flow; this route is
 * that flow for local development.
 */
export default async function DemoEditorPage() {
  const { document, projectId, revisionId } = await documentService.loadOrCreate("demo");

  return <EditorShell projectId={projectId} revisionId={revisionId} document={document} />;
}

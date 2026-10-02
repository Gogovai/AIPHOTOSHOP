import type { Metadata } from "next";

import { EditorShell } from "@/components/editor/editor-shell";

interface EditorPageProps {
  readonly params: Promise<{ projectId: string }>;
}

export const metadata: Metadata = {
  title: "AIPHOTOSHOP — Editor",
};

/**
 * The editor route. Any project id loads — there is no lookup yet because
 * persistence does not exist until Milestone 004. The page composes the shell
 * and stays a server component; interactivity lives inside the shell's client
 * islands.
 */
export default async function EditorPage({ params }: EditorPageProps) {
  const { projectId } = await params;
  return <EditorShell projectId={projectId} />;
}

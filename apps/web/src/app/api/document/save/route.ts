import { type NextRequest, NextResponse } from "next/server";

import { DocumentNotFoundError, RevisionConflictError } from "@aiphotoshop/document-store";

import { documentRepository } from "@/lib/repository";

/**
 * Save the current document as a new immutable revision.
 *
 * The editor posts the project id and the revision it was loaded against. The
 * document itself lives server-side; this route loads the current revision and
 * appends it as a new revision, honoring optimistic concurrency. It never
 * trusts a client-provided document payload.
 */
export async function POST(request: NextRequest) {
  let body: { projectId?: string; expectedCurrentRevisionId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const projectId = body.projectId;
  const expectedCurrentRevisionId = body.expectedCurrentRevisionId ?? null;

  if (typeof projectId !== "string" || projectId.length === 0) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  try {
    const current = await documentRepository.load(projectId);
    const { revisionId, revisionNumber } = await documentRepository.save({
      document: current.document,
      expectedCurrentRevisionId,
      summary: {
        source: "user",
        operationCount: 0,
        description: "Manual save",
      },
    });

    return NextResponse.json({ success: true, revisionId, revisionNumber });
  } catch (error) {
    if (error instanceof RevisionConflictError) {
      return NextResponse.json(
        {
          success: false,
          error: "The document changed since you loaded it. Please reload and try again.",
        },
        { status: 409 },
      );
    }

    if (error instanceof DocumentNotFoundError) {
      return NextResponse.json({ success: false, error: "Document not found." }, { status: 404 });
    }

    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

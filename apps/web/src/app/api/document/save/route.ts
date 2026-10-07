import { type NextRequest, NextResponse } from "next/server";

import {
  DocumentNotFoundError,
  RevisionConflictError,
  type ChangeSet,
  type ChangeSetOperation,
} from "@aiphotoshop/document-store";
import { parseDocument, type DesignNode, type NodeId } from "@aiphotoshop/design-schema";

import { documentRepository } from "@/lib/repository";

/**
 * Save the current document as a new immutable revision.
 *
 * The editor posts the project id, the revision it was loaded against,
 * the current DesignDocument, and an optional ChangeSet representing the
 * operations since the last save. The server validates everything before
 * persisting through the repository.
 */
export async function POST(request: NextRequest) {
  let body: {
    projectId?: string;
    expectedCurrentRevisionId?: string;
    document?: unknown;
    changeSet?: unknown;
  };

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

  // Validate document
  if (body.document === undefined || body.document === null) {
    return NextResponse.json({ error: "document is required." }, { status: 400 });
  }

  let document: ReturnType<typeof parseDocument>;
  try {
    document = parseDocument(body.document);
  } catch (error) {
    return NextResponse.json(
      { error: `Invalid document: ${error instanceof Error ? error.message : String(error)}` },
      { status: 400 },
    );
  }

  if (document.id !== projectId) {
    return NextResponse.json({ error: "Document ID does not match projectId." }, { status: 400 });
  }

  // Validate ChangeSet if provided
  let changeSet: ChangeSet | undefined;
  if (body.changeSet !== undefined && body.changeSet !== null) {
    const validation = validateChangeSet(body.changeSet);
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Invalid ChangeSet: ${validation.error}` },
        { status: 400 },
      );
    }
    changeSet = validation.changeSet;
  }

  try {
    const { revisionId, revisionNumber } = await documentRepository.save({
      document,
      expectedCurrentRevisionId,
      summary: changeSet
        ? {
            source: changeSet.source,
            operationCount: changeSet.operations.length,
            operations: changeSet.operations.map((op) => op.operation),
            description: changeSet.description,
          }
        : undefined,
      changeSet,
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

function validateChangeSet(
  value: unknown,
): { valid: true; changeSet: ChangeSet } | { valid: false; error: string } {
  if (!value || typeof value !== "object") {
    return { valid: false, error: "ChangeSet must be an object" };
  }

  const cs = value as Record<string, unknown>;

  if (typeof cs.id !== "string" || cs.id.length === 0) {
    return { valid: false, error: "ChangeSet.id must be a non-empty string" };
  }

  if (cs.source !== "user" && cs.source !== "system" && cs.source !== "restore") {
    return { valid: false, error: "ChangeSet.source must be 'user' | 'system' | 'restore'" };
  }

  if (!Array.isArray(cs.operations)) {
    return { valid: false, error: "ChangeSet.operations must be an array" };
  }

  const operations: ChangeSetOperation[] = [];

  for (let i = 0; i < cs.operations.length; i++) {
    const op = cs.operations[i];
    const validation = validateChangeSetOperation(op, i);
    if (!validation.valid) {
      return { valid: false, error: validation.error };
    }
    operations.push(validation.operation);
  }

  return {
    valid: true,
    changeSet: {
      id: cs.id,
      source: cs.source as "user" | "system" | "restore",
      operations,
      description: typeof cs.description === "string" ? cs.description : undefined,
    },
  };
}

function validateChangeSetOperation(
  value: unknown,
  index: number,
): { valid: true; operation: ChangeSetOperation } | { valid: false; error: string } {
  if (!value || typeof value !== "object") {
    return { valid: false, error: `operations[${index}] must be an object` };
  }

  const op = value as Record<string, unknown>;

  if (typeof op.operation !== "string") {
    return { valid: false, error: `operations[${index}].operation must be a string` };
  }

  const validOps = [
    "addNode",
    "removeNode",
    "renameNode",
    "reparentNode",
    "reorderNode",
    "groupNodes",
    "ungroupNode",
    "setVisibility",
    "setLocked",
  ];

  if (!validOps.includes(op.operation)) {
    return {
      valid: false,
      error: `operations[${index}].operation must be one of: ${validOps.join(", ")}`,
    };
  }

  const operation = op.operation as ChangeSetOperation["operation"];

  switch (operation) {
    case "addNode": {
      if (!op.node || typeof op.node !== "object") {
        return { valid: false, error: `operations[${index}].addNode requires a 'node' object` };
      }
      // The node will be validated by parseDocument when the full document is validated
      return {
        valid: true,
        operation: {
          operation: "addNode",
          node: op.node as DesignNode,
          index: typeof op.index === "number" ? op.index : undefined,
        },
      };
    }
    case "removeNode": {
      if (typeof op.nodeId !== "string") {
        return { valid: false, error: `operations[${index}].removeNode requires nodeId string` };
      }
      return { valid: true, operation: { operation: "removeNode", nodeId: op.nodeId as NodeId } };
    }
    case "renameNode": {
      if (typeof op.nodeId !== "string" || typeof op.name !== "string") {
        return {
          valid: false,
          error: `operations[${index}].renameNode requires nodeId and name strings`,
        };
      }
      return {
        valid: true,
        operation: { operation: "renameNode", nodeId: op.nodeId as NodeId, name: op.name },
      };
    }
    case "reparentNode": {
      if (typeof op.nodeId !== "string" || typeof op.parentId !== "string") {
        return {
          valid: false,
          error: `operations[${index}].reparentNode requires nodeId and parentId strings`,
        };
      }
      return {
        valid: true,
        operation: {
          operation: "reparentNode",
          nodeId: op.nodeId as NodeId,
          parentId: op.parentId as NodeId,
          index: typeof op.index === "number" ? op.index : undefined,
        },
      };
    }
    case "reorderNode": {
      if (typeof op.nodeId !== "string" || typeof op.index !== "number") {
        return {
          valid: false,
          error: `operations[${index}].reorderNode requires nodeId string and index number`,
        };
      }
      return {
        valid: true,
        operation: { operation: "reorderNode", nodeId: op.nodeId as NodeId, index: op.index },
      };
    }
    case "groupNodes": {
      if (
        !Array.isArray(op.nodeIds) ||
        !op.nodeIds.every((id: unknown) => typeof id === "string")
      ) {
        return {
          valid: false,
          error: `operations[${index}].groupNodes requires nodeIds string array`,
        };
      }
      return {
        valid: true,
        operation: {
          operation: "groupNodes",
          nodeIds: op.nodeIds as unknown as readonly NodeId[],
          groupId: typeof op.groupId === "string" ? (op.groupId as NodeId) : undefined,
          name: typeof op.name === "string" ? op.name : undefined,
        },
      };
    }
    case "ungroupNode": {
      if (typeof op.nodeId !== "string") {
        return { valid: false, error: `operations[${index}].ungroupNode requires nodeId string` };
      }
      return { valid: true, operation: { operation: "ungroupNode", nodeId: op.nodeId as NodeId } };
    }
    case "setVisibility": {
      if (typeof op.nodeId !== "string" || typeof op.visible !== "boolean") {
        return {
          valid: false,
          error: `operations[${index}].setVisibility requires nodeId string and visible boolean`,
        };
      }
      return {
        valid: true,
        operation: { operation: "setVisibility", nodeId: op.nodeId as NodeId, visible: op.visible },
      };
    }
    case "setLocked": {
      if (typeof op.nodeId !== "string" || typeof op.locked !== "boolean") {
        return {
          valid: false,
          error: `operations[${index}].setLocked requires nodeId string and locked boolean`,
        };
      }
      return {
        valid: true,
        operation: { operation: "setLocked", nodeId: op.nodeId as NodeId, locked: op.locked },
      };
    }
  }
}

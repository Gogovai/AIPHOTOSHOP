"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  type ReactNode,
  type Dispatch,
} from "react";

import type { DesignDocument } from "@aiphotoshop/design-schema";
import { type DocumentOperation } from "@aiphotoshop/design-engine";
import { type ChangeSet } from "@aiphotoshop/document-store";
import {
  applyOperationWithRecord,
  applyChangeSet,
  createHistory,
  prepareChangeSet,
  type History,
  type ChangeSetOperation,
  type PreparedChangeSet,
} from "@aiphotoshop/document-store";

interface EditorDocumentState {
  readonly document: DesignDocument;
  readonly history: History;
  readonly revisionId: string;
  readonly projectId: string;
  readonly hasUnsavedChanges: boolean;
  readonly pendingChangeSet: ChangeSet | null;
}

type EditorDocumentAction =
  | { readonly type: "APPLY_OPERATION"; readonly operation: DocumentOperation }
  | { readonly type: "APPLY_CHANGE_SET"; readonly prepared: PreparedChangeSet }
  | { readonly type: "UNDO" }
  | { readonly type: "REDO" }
  | { readonly type: "MARK_SAVED"; readonly revisionId: string }
  | { readonly type: "RESET"; readonly document: DesignDocument; readonly revisionId: string };

function editorDocumentReducer(
  state: EditorDocumentState,
  action: EditorDocumentAction,
): EditorDocumentState {
  switch (action.type) {
    case "APPLY_OPERATION": {
      const record = applyOperationWithRecord(state.document, action.operation);
      const changeSetOp = action.operation as unknown as ChangeSetOperation;
      const changeSet: ChangeSet = {
        id: `cs-${Date.now()}`,
        source: "user",
        operations: [changeSetOp],
        description: undefined,
      };
      const prepared = prepareChangeSet(changeSet);
      const newHistory = createHistory();
      newHistory.attach(state.document);
      newHistory.apply(prepared);
      return {
        ...state,
        document: record.nextDocument,
        history: newHistory,
        hasUnsavedChanges: true,
        pendingChangeSet: changeSet,
      };
    }
    case "APPLY_CHANGE_SET": {
      const { document } = applyChangeSet(state.document, action.prepared);
      const newHistory = createHistory();
      newHistory.attach(state.document);
      newHistory.apply(action.prepared);
      return {
        ...state,
        document,
        history: newHistory,
        hasUnsavedChanges: true,
        pendingChangeSet: action.prepared.changeSet,
      };
    }
    case "UNDO": {
      const doc = state.history.undo();
      return { ...state, document: doc, hasUnsavedChanges: true };
    }
    case "REDO": {
      const doc = state.history.redo();
      return { ...state, document: doc, hasUnsavedChanges: true };
    }
    case "MARK_SAVED": {
      return {
        ...state,
        revisionId: action.revisionId,
        hasUnsavedChanges: false,
        pendingChangeSet: null,
      };
    }
    case "RESET": {
      const newHistory = createHistory();
      newHistory.attach(action.document);
      return {
        ...state,
        document: action.document,
        history: newHistory,
        revisionId: action.revisionId,
        hasUnsavedChanges: false,
        pendingChangeSet: null,
      };
    }
  }
}

interface EditorDocumentContextValue {
  readonly state: EditorDocumentState;
  readonly dispatch: Dispatch<EditorDocumentAction>;
  readonly applyOperation: (operation: DocumentOperation) => void;
  readonly applyChangeSet: (changeSet: ChangeSet) => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

const EditorDocumentContext = createContext<EditorDocumentContextValue | null>(null);

interface EditorDocumentProviderProps {
  readonly children: ReactNode;
  readonly initialDocument: DesignDocument;
  readonly initialRevisionId: string;
  readonly projectId: string;
}

export function EditorDocumentProvider({
  children,
  initialDocument,
  initialRevisionId,
  projectId,
}: EditorDocumentProviderProps) {
  const [state, dispatch] = useReducer(editorDocumentReducer, {
    document: initialDocument,
    history: (() => {
      const h = createHistory();
      h.attach(initialDocument);
      return h;
    })(),
    revisionId: initialRevisionId,
    projectId,
    hasUnsavedChanges: false,
    pendingChangeSet: null,
  });

  const applyOperation = useCallback((operation: DocumentOperation) => {
    dispatch({ type: "APPLY_OPERATION", operation });
  }, []);

  const applyChangeSet = useCallback((changeSet: ChangeSet) => {
    const prepared = prepareChangeSet(changeSet);
    dispatch({ type: "APPLY_CHANGE_SET", prepared });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: "REDO" });
  }, []);

  const canUndo = state.history.canUndo;
  const canRedo = state.history.canRedo;

  const value = useMemo<EditorDocumentContextValue>(
    () => ({
      state,
      dispatch,
      applyOperation,
      applyChangeSet,
      undo,
      redo,
      canUndo,
      canRedo,
    }),
    [state, applyOperation, applyChangeSet, undo, redo, canUndo, canRedo],
  );

  return <EditorDocumentContext.Provider value={value}>{children}</EditorDocumentContext.Provider>;
}

export function useEditorDocument(): EditorDocumentContextValue {
  const context = useContext(EditorDocumentContext);
  if (context === null) {
    throw new Error("useEditorDocument must be used within an EditorDocumentProvider");
  }
  return context;
}

export function useEditorDocumentState(): EditorDocumentState {
  return useEditorDocument().state;
}

export function useEditorDocumentDispatch(): Dispatch<EditorDocumentAction> {
  return useEditorDocument().dispatch;
}

export function useApplyOperation(): (operation: DocumentOperation) => void {
  return useEditorDocument().applyOperation;
}

export function useApplyChangeSet(): (changeSet: ChangeSet) => void {
  return useEditorDocument().applyChangeSet;
}

export function useUndo(): () => void {
  return useEditorDocument().undo;
}

export function useRedo(): () => void {
  return useEditorDocument().redo;
}

export function useCanUndo(): boolean {
  return useEditorDocument().canUndo;
}

export function useCanRedo(): boolean {
  return useEditorDocument().canRedo;
}

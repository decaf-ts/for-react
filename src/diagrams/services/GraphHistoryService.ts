import { signal, computed } from '../internal/reactive.js';
import { GRAPH_HISTORY_LIMIT_DEFAULT } from '../internal/config.js';
import type { GraphWorkflowSnapshot } from '@decaf-ts/as-graph/shared';

/**
 * @description A history checkpoint: the canonical document-first snapshot wrapper (§4.26 R2-2).
 * @summary A history checkpoint: the canonical document-first snapshot wrapper (§4.26 R2-2).
 * @memberOf module:for-react.diagrams
 */
export type GraphHistorySnapshot = GraphWorkflowSnapshot;

/**
 * @description One undo/redo entry: the checkpointed snapshot with a change label and timestamp.
 * @summary One undo/redo entry: the checkpointed snapshot with a change label and timestamp.
 * @memberOf module:for-react.diagrams
 */
export interface GraphHistoryEntry {
  snapshot: GraphHistorySnapshot;
  label: string;
  timestamp: number;
}

interface WorkflowHistory {
  entries: GraphHistoryEntry[];
  cursor: number;
}

/**
 * @description Per-workflow undo/redo history: keeps bounded snapshot checkpoints with a cursor, and exposes `canUndo`/`canRedo` signals for the toolbar. Stores the canonical snapshot wrapper only (§4.26 R2-2).
 * @summary Per-workflow undo/redo history: keeps bounded snapshot checkpoints with a cursor, and exposes `canUndo`/`canRedo` signals for the toolbar.
 * @memberOf module:for-react.diagrams
 */
export class GraphHistoryService {
  constructor(private readonly limit: number = GRAPH_HISTORY_LIMIT_DEFAULT) {}
  private readonly histories = new Map<string, WorkflowHistory>();
  private readonly activeWorkflowId = signal<string | null>(null);

  readonly canUndo = computed(() => {
    const id = this.activeWorkflowId();
    if (!id) return false;
    const h = this.histories.get(id);
    return !!h && h.cursor > 0;
  });

  readonly canRedo = computed(() => {
    const id = this.activeWorkflowId();
    if (!id) return false;
    const h = this.histories.get(id);
    return !!h && h.cursor < h.entries.length - 1;
  });

  setActiveWorkflow(workflowId: string): void {
    this.activeWorkflowId.set(workflowId);
  }

  push(workflowId: string, snapshot: GraphHistorySnapshot, label = 'change'): void {
    let h = this.histories.get(workflowId);
    if (!h) {
      h = { entries: [], cursor: -1 };
      this.histories.set(workflowId, h);
    }

    const entry: GraphHistoryEntry = {
      snapshot: this.cloneSnapshot(snapshot),
      label,
      timestamp: Date.now(),
    };

    if (h.cursor < h.entries.length - 1) {
      h.entries = h.entries.slice(0, h.cursor + 1);
    }

    h.entries.push(entry);

    if (h.entries.length > this.limit) {
      h.entries.shift();
    }

    h.cursor = h.entries.length - 1;
    this.activeWorkflowId.set(workflowId);
  }

  undo(workflowId: string): GraphHistoryEntry | undefined {
    const h = this.histories.get(workflowId);
    if (!h || h.cursor <= 0) return undefined;
    h.cursor--;
    return h.entries[h.cursor];
  }

  redo(workflowId: string): GraphHistoryEntry | undefined {
    const h = this.histories.get(workflowId);
    if (!h || h.cursor >= h.entries.length - 1) return undefined;
    h.cursor++;
    return h.entries[h.cursor];
  }

  canUndoFor(workflowId: string): boolean {
    const h = this.histories.get(workflowId);
    return !!h && h.cursor > 0;
  }

  canRedoFor(workflowId: string): boolean {
    const h = this.histories.get(workflowId);
    return !!h && h.cursor < h.entries.length - 1;
  }

  current(workflowId: string): GraphHistoryEntry | undefined {
    const h = this.histories.get(workflowId);
    if (!h || h.cursor < 0) return undefined;
    return h.entries[h.cursor];
  }

  clear(workflowId: string): void {
    this.histories.delete(workflowId);
  }

  clearAll(): void {
    this.histories.clear();
  }

  setLimit(_limit: number): void {
    throw new Error('setLimit not supported when limit is injected via GRAPH_HISTORY_LIMIT token');
  }

  private cloneSnapshot(snapshot: GraphHistorySnapshot): GraphHistorySnapshot {
    if (typeof globalThis.structuredClone === 'function') {
      try {
        return globalThis.structuredClone(snapshot);
      } catch {
        // fall through
      }
    }
    return JSON.parse(JSON.stringify(snapshot)) as GraphHistorySnapshot;
  }
}

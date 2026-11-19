
import { GraphAutoSaveService } from './GraphAutoSaveService.js';
import { GraphHistoryService } from './GraphHistoryService.js';
import { GraphWorkflowDocumentStore } from '../document/GraphWorkflowDocumentStore.js';
import type {
  GraphWorkflowDocument,
  GraphWorkflowSnapshot,
} from '@decaf-ts/as-graph/shared';

/**
 * @description The editor interaction class that produced a mutation, driving history labels and autosave.
 * @summary The editor interaction class that produced a mutation, driving history labels and autosave.
 * @memberOf module:for-react.diagrams
 */
export type GraphMutationSource =
  | 'node-position'
  | 'edge-connect'
  | 'edge-disconnect'
  | 'port-toggle'
  | 'node-crud';

/**
 * @description Bridges editor mutations to history and autosave: records checkpoints into {@link GraphHistoryService} (labelled by mutation source) and notifies {@link GraphAutoSaveService}, snapshotting via the configured builder.
 * @summary Bridges editor mutations to history and autosave: records checkpoints into {@link GraphHistoryService} (labelled by mutation source) and notifies {@link GraphAutoSaveService}, snapshotting via the configured builder.
 * @memberOf module:for-react.diagrams
 */
export class GraphMutationDetectorService {
  constructor(
    private readonly autoSave: GraphAutoSaveService = new GraphAutoSaveService(),
    private readonly history: GraphHistoryService = new GraphHistoryService(),
    private readonly documentStore: GraphWorkflowDocumentStore = new GraphWorkflowDocumentStore()
  ) {}

  private snapshotBuilder: (() => GraphWorkflowSnapshot | null) | null = null;
  private workflowId: string | null = null;

  configure(
    workflowId: string,
    snapshotBuilder: () => GraphWorkflowSnapshot | null,
  ): void {
    this.workflowId = workflowId;
    this.snapshotBuilder = snapshotBuilder;
  }

  /**
   * Records one canvas mutation: the mutation reads from
   * {@link GraphWorkflowDocumentStore} (spec §4.11) — the canonical path is the
   * only path after the P7 cutover.
   */
  recordMutation(source: GraphMutationSource): void {
    if (!this.workflowId) return;

    this.recordFromStore(source);
  }

  private recordFromStore(source: GraphMutationSource): void {
    const workflowId = this.workflowId;
    if (!workflowId) return;

    const document = this.documentStore.document();
    if (!document) return;

    const snapshot = this.canonicalSnapshotOf(document);

    if (this.autoSave.enabled()) {
      this.autoSave.onMutation(workflowId, snapshot);
    } else {
      this.history.push(workflowId, snapshot, source);
    }
  }

  /**
   * Builds the canonical history/autosave entry for one mutation: the document
   * always comes from the {@link GraphWorkflowDocumentStore} (spec §4.11) while
   * `editor`/`metadata` carry the live editor-only state (boundary values, node
   * ports/configs, duplicate counts, viewport metadata) for lossless round trips.
   */
  private canonicalSnapshotOf(document: GraphWorkflowDocument): GraphWorkflowSnapshot {
    const snapshot = this.snapshotBuilder?.() ?? null;
    if (!snapshot) return { document };
    return { document, editor: snapshot.editor, metadata: snapshot.metadata };
  }
}

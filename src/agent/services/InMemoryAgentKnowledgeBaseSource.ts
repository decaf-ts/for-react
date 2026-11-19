/**
 * @file
 * @summary Promise-backed in-memory {@link AgentChatKnowledgeBaseSource} used
 * by the knowledge-base selector when no persistent backend is configured.
 * @description Uploads immediately resolve the entry as `ready`; entries are
 * copied on write. The Angular baseline exposes these sources as RxJS
 * observables; the React port uses the promise contract declared in
 * `../types`.
 */
import type {
  AgentChatKnowledgeBaseEntry,
  AgentChatKnowledgeBaseSource,
} from "../types.js";

/**
 * In-memory knowledge-base source.
 *
 * @param entries - Initial knowledge-base entries; defaults to an empty list.
 * @memberOf module:for-react.agent
 */
export class InMemoryAgentKnowledgeBaseSource
  implements AgentChatKnowledgeBaseSource
{
  private entries: AgentChatKnowledgeBaseEntry[] = [];

  constructor(entries: AgentChatKnowledgeBaseEntry[] = []) {
    this.entries = [...entries];
  }

  /** Replaces the stored entries with a copy of `entries`. */
  seed(entries: AgentChatKnowledgeBaseEntry[]): void {
    this.entries = [...entries];
  }

  /** Alias of {@link seed} for source-compatible callers. */
  setEntries(entries: AgentChatKnowledgeBaseEntry[]): void {
    this.seed(entries);
  }

  /** Returns a copy of every stored entry. */
  all(): AgentChatKnowledgeBaseEntry[] {
    return [...this.entries];
  }

  /** Returns every stored entry. */
  async list(): Promise<AgentChatKnowledgeBaseEntry[]> {
    return this.all();
  }

  /**
   * Creates or updates an entry from an uploaded file.
   *
   * @param entryId - Existing entry id to update, or `undefined` to create one.
   * @param file - Uploaded file providing the name, MIME type, and size.
   * @returns The created or updated entry.
   */
  async upload(
    entryId: string | undefined,
    file: File
  ): Promise<AgentChatKnowledgeBaseEntry> {
    const updatedAt = new Date().toISOString();
    const existing = entryId
      ? this.entries.find((entry) => entry.id === entryId)
      : undefined;
    const updated: AgentChatKnowledgeBaseEntry = existing
      ? {
          ...existing,
          fileName: file.name,
          mime: file.type || existing.mime,
          size: file.size,
          status: "ready",
          updatedAt,
        }
      : {
          id: entryId || `kb-${Date.now()}-${this.entries.length + 1}`,
          label: file.name,
          fileName: file.name,
          mime: file.type || "application/octet-stream",
          size: file.size,
          status: "ready",
          updatedAt,
        };
    this.entries = existing
      ? this.entries.map((entry) =>
          entry.id === existing.id ? updated : entry
        )
      : [...this.entries, updated];
    return updated;
  }

  /**
   * Removes an entry by id.
   *
   * @param entryId - Id of the entry to remove.
   * @returns Resolves after the entry is removed.
   */
  async remove(entryId: string): Promise<void> {
    this.entries = this.entries.filter((entry) => entry.id !== entryId);
  }
}

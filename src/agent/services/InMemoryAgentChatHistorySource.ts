/**
 * @file
 * @summary Promise-backed in-memory {@link AgentChatHistorySource} used by the
 * chat history sidebar when no persistent backend is configured.
 * @description Entries are copied on write; reads return copies so consumers
 * cannot mutate internal state. The Angular baseline exposes these sources as
 * RxJS observables; the React port uses the promise contract declared in
 * `../types`.
 */
import type {
  AgentChatHistoryEntry,
  AgentChatHistoryPageQuery,
  AgentChatHistorySource,
} from "../types.js";

/**
 * In-memory conversation history source.
 *
 * @param entries - Initial conversation entries; defaults to an empty list.
 * @memberOf module:for-react.agent
 */
export class InMemoryAgentChatHistorySource implements AgentChatHistorySource {
  private entries: AgentChatHistoryEntry[] = [];

  constructor(entries: AgentChatHistoryEntry[] = []) {
    this.entries = [...entries];
  }

  /** Replaces the stored entries with a copy of `entries`. */
  seed(entries: AgentChatHistoryEntry[]): void {
    this.entries = [...entries];
  }

  /** Alias of {@link seed} for source-compatible callers. */
  setEntries(entries: AgentChatHistoryEntry[]): void {
    this.seed(entries);
  }

  /** Returns a copy of every stored entry. */
  all(): AgentChatHistoryEntry[] {
    return [...this.entries];
  }

  /**
   * Lists a page of entries.
   *
   * @param query - Optional one-based page request; omitted returns every entry.
   * @returns The requested page of entries.
   */
  async list(
    query?: AgentChatHistoryPageQuery
  ): Promise<AgentChatHistoryEntry[]> {
    if (!query) return this.all();
    const start = Math.max(0, (query.page - 1) * query.pageSize);
    return this.entries.slice(start, start + query.pageSize);
  }

  /**
   * Deletes an entry by id.
   *
   * @param id - Id of the entry to remove.
   * @returns Resolves after the entry is removed.
   */
  async delete(id: string): Promise<void> {
    this.entries = this.entries.filter((entry) => entry.id !== id);
  }
}

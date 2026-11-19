/**
 * @file
 * @summary Knowledge-base selector with search, upload, selection and deletion.
 * @description Renders the `ChatKnowledgeBaseSelector` agent chat component and its props contract.
 */
import React, { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type {
  AgentChatKnowledgeBaseEntry,
  AgentChatKnowledgeBaseSource,
  AgentChatKnowledgeSource,
  AgentChatKnowledgeUpload,
} from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

let uploadSequence = 0;

/**
 * @description Props accepted by {@link ChatKnowledgeBaseSelector}.
 * @summary Declares every input the ChatKnowledgeBaseSelector component understands.
 * @memberOf module:for-react.agent
 * @property {boolean} [open] - Whether the surface is open.
 * @property {Array | string} [entries] - Entries rendered by the list.
 * @property {Array | string} [sources] - Knowledge sources rendered by the selector.
 * @property {AgentChatKnowledgeBaseSource} [source] - Data source backing the component.
 * @property {Array} [selectedIds] - Selected knowledge-base ids.
 * @property {boolean} [loading] - Whether the list is loading.
 * @property {boolean} [uploadEnabled] - Whether uploads are allowed.
 * @property {boolean} [deleteEnabled] - Whether deletion is allowed.
 * @property {number} [skeletonRows] - Number of skeleton rows rendered while loading.
 * @property {string} [title] - Title text.
 * @property {function} [onSelectionChange] - Called with the selected ids.
 * @property {function} [onCountChange] - Called with the selected count.
 * @property {function} [onOpenChange] - Called when the open state changes.
 * @property {function} [onEntriesChange] - Called with the updated entries.
 * @property {function} [onUpload] - Called with the upload to start.
 * @property {function} [onRemove] - Called when an item is removed.
 */
export interface ChatKnowledgeBaseSelectorProps {
  open?: boolean;
  entries?: AgentChatKnowledgeBaseEntry[] | null;
  sources?: AgentChatKnowledgeSource[] | null;
  source?: AgentChatKnowledgeBaseSource;
  selectedIds?: string[];
  loading?: boolean;
  uploadEnabled?: boolean;
  deleteEnabled?: boolean;
  skeletonRows?: number;
  title?: string | null;
  onSelectionChange?: (ids: string[]) => void;
  onCountChange?: (count: number) => void;
  onOpenChange?: (open: boolean) => void;
  onEntriesChange?: (entries: AgentChatKnowledgeBaseEntry[]) => void;
  onUpload?: (upload: AgentChatKnowledgeUpload) => void;
  onRemove?: (entry: AgentChatKnowledgeBaseEntry) => void;
}

function toEntry(source: AgentChatKnowledgeSource): AgentChatKnowledgeBaseEntry {
  return { id: source.id, label: source.label, status: "ready" };
}

function upsertEntry(
  entries: AgentChatKnowledgeBaseEntry[],
  entry: AgentChatKnowledgeBaseEntry
): AgentChatKnowledgeBaseEntry[] {
  const index = entries.findIndex((candidate) => candidate.id === entry.id);
  if (index < 0) return [...entries, entry];
  return entries.map((candidate) =>
    candidate.id === entry.id ? entry : candidate
  );
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function statusFallbackOf(upload: AgentChatKnowledgeUpload): string {
  switch (upload.status) {
    case "queued":
      return "Queued";
    case "uploading":
      return "Uploading…";
    case "done":
      return "Uploaded";
    case "error":
      return "Upload failed";
  }
}

function initialItems(
  entries: AgentChatKnowledgeBaseEntry[] | null,
  sources: AgentChatKnowledgeSource[] | null
): AgentChatKnowledgeBaseEntry[] {
  if (entries !== null) return entries;
  if (sources !== null) return sources.map(toEntry);
  return [];
}

/**
 * @description Knowledge-base selector with search, upload, selection and deletion.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatKnowledgeBaseSelector({
  open = true,
  entries = null,
  sources = null,
  source,
  selectedIds = [],
  loading = false,
  uploadEnabled = true,
  deleteEnabled = true,
  skeletonRows = 3,
  title = null,
  onSelectionChange,
  onCountChange,
  onOpenChange,
  onEntriesChange,
  onUpload,
  onRemove,
}: ChatKnowledgeBaseSelectorProps) {
  const t = useAgentTranslate();
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingEntryId = useRef<string | undefined>(undefined);
  const queued = useRef(new Map<string, { file: File; entryId?: string }>());
  const uploadsRef = useRef<AgentChatKnowledgeUpload[]>([]);
  const processing = useRef(false);

  const [items, setItems] = useState<AgentChatKnowledgeBaseEntry[]>(() =>
    initialItems(entries, sources)
  );
  const itemsRef = useRef(items);
  const [selected, setSelected] = useState<string[]>(selectedIds);
  const selectedRef = useRef(selected);
  const [uploads, setUploads] = useState<AgentChatKnowledgeUpload[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);

  const usesSource = entries === null && sources === null;
  const isLoading = loading || internalLoading;
  const isEmpty = !isLoading && items.length === 0;
  const total = items.length;
  const visibleIds = new Set(items.map((entry) => entry.id));
  const validSelected = selected.filter((id) => visibleIds.has(id));
  const selectedCount = validSelected.length;
  const allSelected = total > 0 && selectedCount === total;
  const someSelected = selectedCount > 0 && !allSelected;
  const skeletonRowList = Array.from({
    length: Math.max(0, skeletonRows),
  });

  const setItemsBoth = (next: AgentChatKnowledgeBaseEntry[]) => {
    itemsRef.current = next;
    setItems(next);
  };

  const setSelectedBoth = (next: string[]) => {
    selectedRef.current = next;
    setSelected(next);
  };

  const setUploadsBoth = (next: AgentChatKnowledgeUpload[]) => {
    uploadsRef.current = next;
    setUploads(next);
  };

  const itemsSignature = JSON.stringify([entries, sources]);
  const itemsSignatureRef = useRef(itemsSignature);
  const selectedSignature = JSON.stringify(selectedIds);
  const selectedSignatureRef = useRef(selectedSignature);

  useEffect(() => {
    if (entries === null && sources === null) return;
    if (itemsSignatureRef.current === itemsSignature) return;
    itemsSignatureRef.current = itemsSignature;
    setItemsBoth(initialItems(entries, sources));
  }, [entries, itemsSignature, sources]);

  useEffect(() => {
    if (selectedSignatureRef.current === selectedSignature) return;
    selectedSignatureRef.current = selectedSignature;
    setSelectedBoth(selectedIds);
  }, [selectedIds, selectedSignature]);

  useEffect(() => {
    if (!usesSource || !source) return;
    let cancelled = false;
    setInternalLoading(true);
    source
      .list()
      .then((list) => {
        if (cancelled) return;
        setItemsBoth(list ?? []);
        setInternalLoading(false);
      })
      .catch(() => {
        if (!cancelled) setInternalLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [usesSource, source]);

  useEffect(() => {
    if (!open) return;
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) return;
      requestClose();
    };
    const onEscape = () => requestClose();
    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("click", onDocumentClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const emitSelection = () => {
    const next = selectedRef.current;
    const count = next.filter((id) =>
      itemsRef.current.some((entry) => entry.id === id)
    ).length;
    onSelectionChange?.(next);
    onCountChange?.(count);
  };

  const requestClose = () => {
    if (!open) return;
    onOpenChange?.(false);
  };

  const isSelected = (entryId: string): boolean =>
    selected.includes(entryId);

  const isDeleting = (entryId: string): boolean =>
    deletingIds.includes(entryId);

  const toggle = (entryId: string) => {
    const next = new Set(selectedRef.current);
    if (next.has(entryId)) next.delete(entryId);
    else next.add(entryId);
    setSelectedBoth([...next]);
    emitSelection();
  };

  const toggleAll = () => {
    setSelectedBoth(
      allSelected ? [] : itemsRef.current.map((entry) => entry.id)
    );
    emitSelection();
  };

  const clearSelection = () => {
    setSelectedBoth([]);
    emitSelection();
  };

  const openFilePicker = (entryId?: string) => {
    if (!uploadEnabled) return;
    pendingEntryId.current = entryId;
    fileInputRef.current?.click();
  };

  const updateUpload = (
    uploadId: string,
    patch: Partial<AgentChatKnowledgeUpload>
  ) => {
    let updated: AgentChatKnowledgeUpload | undefined;
    setUploadsBoth(
      uploadsRef.current.map((row) => {
        if (row.id !== uploadId) return row;
        updated = { ...row, ...patch };
        return updated;
      })
    );
    if (updated) onUpload?.(updated);
  };

  const entryFromUpload = (
    upload: AgentChatKnowledgeUpload
  ): AgentChatKnowledgeBaseEntry => {
    const existing = upload.entryId
      ? itemsRef.current.find((entry) => entry.id === upload.entryId)
      : undefined;
    if (existing) {
      return {
        ...existing,
        fileName: upload.name,
        size: upload.size,
        status: "ready",
        updatedAt: new Date().toISOString(),
      };
    }
    return {
      id: upload.entryId || `kb-${Date.now()}-${upload.id}`,
      label: upload.name,
      fileName: upload.name,
      size: upload.size,
      status: "ready",
      updatedAt: new Date().toISOString(),
    };
  };

  const performUpload = async (
    entryId: string | undefined,
    file: File | undefined
  ): Promise<AgentChatKnowledgeBaseEntry | void> => {
    if (!file) return undefined;
    const result = source?.upload?.(entryId, file);
    if (!result) {
      await Promise.resolve();
      return undefined;
    }
    return result;
  };

  const processQueue = async () => {
    if (processing.current) return;
    processing.current = true;
    for (;;) {
      const next = uploadsRef.current.find((row) => row.status === "queued");
      if (!next) break;
      const queuedFile = queued.current.get(next.id);
      updateUpload(next.id, { status: "uploading" });
      try {
        const result = await performUpload(next.entryId, queuedFile?.file);
        const updated = result ?? entryFromUpload(next);
        if (updated) {
          setItemsBoth(upsertEntry(itemsRef.current, updated));
          onEntriesChange?.(itemsRef.current);
        }
        updateUpload(next.id, { status: "done", progress: 1 });
      } catch (uploadError) {
        updateUpload(next.id, {
          status: "error",
          error:
            uploadError instanceof Error
              ? uploadError.message
              : String(uploadError),
        });
      }
      queued.current.delete(next.id);
    }
    processing.current = false;
  };

  const queueFiles = (
    files: File[],
    entryId?: string
  ): AgentChatKnowledgeUpload[] => {
    if (!files.length) return [];
    const rows = files.map<AgentChatKnowledgeUpload>((file) => ({
      id: `upload:${++uploadSequence}`,
      name: file.name,
      size: file.size,
      entryId,
      status: "queued",
    }));
    rows.forEach((row, index) => {
      queued.current.set(row.id, { file: files[index], entryId });
    });
    setUploadsBoth([...uploadsRef.current, ...rows]);
    rows.forEach((row) => onUpload?.(row));
    void processQueue();
    return rows;
  };

  const onFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const files = Array.from(input.files ?? []);
    const entryId = pendingEntryId.current;
    pendingEntryId.current = undefined;
    input.value = "";
    queueFiles(files, entryId);
  };

  const dismissUpload = (uploadId: string) => {
    setUploadsBoth(uploadsRef.current.filter((row) => row.id !== uploadId));
    queued.current.delete(uploadId);
  };

  const requestDelete = async (entry: AgentChatKnowledgeBaseEntry) => {
    if (!deleteEnabled || isDeleting(entry.id)) return;
    setDeletingIds((ids) => [...ids, entry.id]);
    onRemove?.(entry);
    try {
      await source?.remove?.(entry.id);
    } catch {
      setDeletingIds((ids) => ids.filter((id) => id !== entry.id));
      return;
    }
    setItemsBoth(itemsRef.current.filter((row) => row.id !== entry.id));
    setSelectedBoth(selectedRef.current.filter((id) => id !== entry.id));
    setDeletingIds((ids) => ids.filter((id) => id !== entry.id));
    emitSelection();
    onEntriesChange?.(itemsRef.current);
  };

  const entrySubtitle = (entry: AgentChatKnowledgeBaseEntry): string => {
    const parts: string[] = [];
    if (entry.fileName && entry.fileName !== entry.label) {
      parts.push(entry.fileName);
    }
    if (typeof entry.size === "number") parts.push(formatBytes(entry.size));
    if (typeof entry.fileCount === "number") {
      parts.push(`${entry.fileCount}`);
    }
    return parts.join(" · ");
  };

  if (!open) return null;

  const heading = title || t("agent.chat.knowledgeBase.title", "Manage knowledge base");

  return (
    <div className="dcf-chat-knowledge-base" role="presentation" ref={rootRef}>
      <div
        className="dcf-chat-knowledge-base__backdrop"
        aria-hidden="true"
        onClick={requestClose}
      />

      <section
        className="dcf-chat-knowledge-base__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title || t("agent.chat.knowledgeBase.aria", "Manage knowledge base")}
      >
        <header className="dcf-chat-knowledge-base__header">
          <div className="dcf-chat-knowledge-base__heading">
            <h2 className="dcf-chat-knowledge-base__title">{heading}</h2>
            <span
              className="dcf-chat-knowledge-base__badge"
              aria-label={`${t("agent.chat.knowledgeBase.count", "Selected")}: ${selectedCount}`}
            >
              {selectedCount}
            </span>
          </div>

          <div className="dcf-chat-knowledge-base__header-actions">
            {uploadEnabled ? (
              <button
                type="button"
                className="dcf-chat-knowledge-base__icon-button"
                aria-label={t("agent.chat.knowledgeBase.upload", "Upload file")}
                title={t("agent.chat.knowledgeBase.upload", "Upload file")}
                onClick={() => openFilePicker()}
              >
                <ChatIcon name="upload" size={16} />
              </button>
            ) : null}
            <button
              type="button"
              className="dcf-chat-knowledge-base__icon-button"
              aria-label={t(
                "agent.chat.knowledgeBase.close",
                "Close knowledge base"
              )}
              title={t("agent.chat.knowledgeBase.close", "Close knowledge base")}
              onClick={requestClose}
            >
              <ChatIcon name="x" size={16} />
            </button>
          </div>
        </header>

        <input
          ref={fileInputRef}
          className="dcf-chat-knowledge-base__file-input"
          type="file"
          multiple
          aria-hidden="true"
          tabIndex={-1}
          onChange={onFilesSelected}
        />

        <div
          className="dcf-chat-knowledge-base__body"
          aria-busy={isLoading ? "true" : "false"}
        >
          {isLoading ? (
            <>
              {skeletonRowList.map((_, index) => (
                <div
                  className="dcf-chat-knowledge-base__skeleton-row"
                  aria-hidden="true"
                  key={index}
                >
                  <span className="dcf-chat-knowledge-base__skeleton-check" />
                  <span className="dcf-chat-knowledge-base__skeleton-lines">
                    <span className="dcf-chat-knowledge-base__skeleton-line" />
                    <span className="dcf-chat-knowledge-base__skeleton-line dcf-chat-knowledge-base__skeleton-line--short" />
                  </span>
                </div>
              ))}
              <p className="dcf-chat-knowledge-base__status">
                {t("agent.chat.knowledgeBase.loading", "Loading documents…")}
              </p>
            </>
          ) : isEmpty ? (
            <div className="dcf-chat-knowledge-base__empty" role="note">
              <ChatIcon name="file" size={24} />
              <p className="dcf-chat-knowledge-base__empty-text">
                {t("agent.chat.knowledgeBase.empty", "No documents yet")}
              </p>
              {uploadEnabled ? (
                <button
                  type="button"
                  className="dcf-chat-knowledge-base__upload-action"
                  onClick={() => openFilePicker()}
                >
                  <ChatIcon name="upload" size={15} />
                  {t("agent.chat.knowledgeBase.upload", "Upload file")}
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="dcf-chat-knowledge-base__toolbar">
                <label className="dcf-chat-knowledge-base__select-all">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(element) => {
                      if (element) element.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                  />
                  <span>
                    {t("agent.chat.knowledgeBase.selectAll", "Select all")}
                  </span>
                </label>
                {selectedCount > 0 ? (
                  <button
                    type="button"
                    className="dcf-chat-knowledge-base__clear"
                    onClick={clearSelection}
                  >
                    {t("agent.chat.knowledgeBase.clear", "Clear selection")}
                  </button>
                ) : null}
              </div>

              <ul className="dcf-chat-knowledge-base__list" role="list">
                {items.map((entry) => {
                  const subtitle = entrySubtitle(entry);
                  return (
                    <li className="dcf-chat-knowledge-base__row" key={entry.id}>
                      <label className="dcf-chat-knowledge-base__entry">
                        <input
                          type="checkbox"
                          checked={isSelected(entry.id)}
                          aria-label={`${t("agent.chat.knowledgeBase.select", "Select")}: ${entry.label}`}
                          onChange={() => toggle(entry.id)}
                        />
                        <span className="dcf-chat-knowledge-base__entry-body">
                          <span className="dcf-chat-knowledge-base__entry-name">
                            {entry.label}
                          </span>
                          {subtitle ? (
                            <span className="dcf-chat-knowledge-base__entry-meta">
                              {subtitle}
                            </span>
                          ) : null}
                        </span>
                      </label>

                      <div className="dcf-chat-knowledge-base__entry-actions">
                        {uploadEnabled ? (
                          <button
                            type="button"
                            className="dcf-chat-knowledge-base__icon-button"
                            aria-label={`${t("agent.chat.knowledgeBase.upload", "Upload file")}: ${entry.label}`}
                            title={t(
                              "agent.chat.knowledgeBase.upload",
                              "Upload file"
                            )}
                            onClick={() => openFilePicker(entry.id)}
                          >
                            <ChatIcon name="upload" size={15} />
                          </button>
                        ) : null}
                        {deleteEnabled ? (
                          <button
                            type="button"
                            className="dcf-chat-knowledge-base__icon-button dcf-chat-knowledge-base__icon-button--danger"
                            disabled={isDeleting(entry.id)}
                            aria-label={`${t("agent.chat.knowledgeBase.delete", "Delete file")}: ${entry.label}`}
                            title={t(
                              "agent.chat.knowledgeBase.delete",
                              "Delete file"
                            )}
                            onClick={() => void requestDelete(entry)}
                          >
                            {isDeleting(entry.id) ? (
                              <ChatIcon name="loader" size={15} />
                            ) : (
                              <ChatIcon name="trash" size={15} />
                            )}
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {uploads.length ? (
            <div
              className="dcf-chat-knowledge-base__queue"
              role="region"
              aria-label={t("agent.chat.knowledgeBase.queue", "Upload queue")}
            >
              <p className="dcf-chat-knowledge-base__queue-title">
                {t("agent.chat.knowledgeBase.queue", "Upload queue")}
              </p>
              <ul className="dcf-chat-knowledge-base__queue-list" role="list">
                {uploads.map((row) => (
                  <li
                    className="dcf-chat-knowledge-base__queue-row"
                    data-status={row.status}
                    key={row.id}
                  >
                    {row.status === "uploading" || row.status === "queued" ? (
                      <ChatIcon name="loader" size={14} />
                    ) : row.status === "done" ? (
                      <ChatIcon name="check" size={14} />
                    ) : (
                      <ChatIcon name="info" size={14} />
                    )}
                    <span className="dcf-chat-knowledge-base__queue-name">
                      {row.name}
                    </span>
                    <span className="dcf-chat-knowledge-base__queue-status">
                      {t(
                        `agent.chat.knowledgeBase.status.${row.status}`,
                        statusFallbackOf(row)
                      )}
                    </span>
                    {row.status === "done" || row.status === "error" ? (
                      <button
                        type="button"
                        className="dcf-chat-knowledge-base__queue-dismiss"
                        aria-label={`${t("agent.chat.knowledgeBase.dismiss", "Dismiss upload")}: ${row.name}`}
                        onClick={() => dismissUpload(row.id)}
                      >
                        <ChatIcon name="x" size={12} />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <footer className="dcf-chat-knowledge-base__footer">
          <span className="dcf-chat-knowledge-base__footer-count">
            {selectedCount}/{total}{" "}
            {t("agent.chat.knowledgeBase.selectedSuffix", "selected")}
          </span>
          <button
            type="button"
            className="dcf-chat-knowledge-base__done"
            onClick={requestClose}
          >
            {t("agent.chat.knowledgeBase.done", "Done")}
          </button>
        </footer>
      </section>
    </div>
  );
}

/**
 * @description Named alias of {@link ChatKnowledgeBaseSelector} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatKnowledgeBaseSelectorComponent = ChatKnowledgeBaseSelector;

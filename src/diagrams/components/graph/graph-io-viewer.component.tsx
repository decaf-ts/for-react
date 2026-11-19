import { useMemo, useState } from 'react';
/**
 * @module for-react/diagrams/components/graph-io-viewer
 * @summary Reusable JSON / table / raw viewer for node I/O inspection.
 * @description Renders an arbitrary value with three toggleable representations
 * (JSON tree, key/value table, raw text). Used for both inputs (right pane)
 * and outputs/error (left pane) of the node inspection split view.
 *
 * SAA-722: the rendered payload is capped at a configurable byte/line limit
 * (default 256 KB / 2000 lines, {@link GRAPH_IO_PANEL_LIMIT}) so a large run
 * payload can never overflow the browser, and a download action fetches the entire
 * untruncated payload from the server run detail endpoint.
 */
import {
  GRAPH_IO_PANEL_LIMIT_DEFAULT,
  type GraphIoPanelLimit,
} from '../../internal/config.js';
import { GraphRunClient } from '../../runs/GraphRunClient.js';
import {
  isGraphBinaryPayload,
  isGraphBinaryReference,
} from '@decaf-ts/as-graph/shared';

/**
 * @description View representation selected in the I/O viewer, rendered as toggle buttons in the panel header. `json` (default) and `raw` are both pretty-printed text (identical output for the current implementation); `table` renders a key/value row grid for records and arrays.
 * @summary View representation selected in the I/O viewer, rendered as toggle buttons in the panel header.
 * @memberOf module:for-react.diagrams
 */export type GraphIoViewMode = 'json' | 'table' | 'raw' | 'binary';

/**
 * @description Modes rendered as toggle buttons, in display order.
 * @summary Modes rendered as toggle buttons, in display order.
 * @memberOf module:for-react.diagrams
 */
export const GRAPH_IO_VIEW_MODES: readonly GraphIoViewMode[] = ['json', 'table', 'raw', 'binary'];

/**
 * @description Node run payload field the viewer renders and downloads.
 * @summary Node run payload field the viewer renders and downloads.
 * @memberOf module:for-react.diagrams
 */
export type GraphIoViewerField = 'inputs' | 'outputs';

/**
 * @description Result of applying the byte/line cap to a rendered payload string.
 * @summary Result of applying the byte/line cap to a rendered payload string.
 * @memberOf module:for-react.diagrams
 */
export interface GraphIoCapResult {
  /** The capped text safe to render. */
  text: string;
  /** Whether any content was dropped by the cap. */
  truncated: boolean;
  /** UTF-8 byte length of the capped text (aggregate table budget accounting). */
  bytes: number;
}

/**
 * Narrowing guard for plain object payloads (excludes `null` and arrays).
 *
 * @param value - The value to test.
 * @returns `true` when the value is a non-array object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Renders an arbitrary payload value as display text: primitives keep their
 * string form, objects/arrays are pretty-printed JSON, and circular or otherwise
 * unserializable values degrade to {@link String} instead of throwing.
 *
 * @param value - The value to render.
 * @returns The printable text form of the value.
 */
function printable(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * @description Caps a rendered payload string to the configured byte and line limits (SAA-722). The byte cap is applied first (so a single huge line cannot overflow the DOM), then the line cap on the byte-capped text. Never mutates the source; the full payload stays available for download. SAA-1432: the result also reports the capped text's UTF-8 byte length so table mode can enforce one aggregate byte budget across all visible rows without re-encoding each cell.
 * @summary Caps a rendered payload string to the configured byte and line limits (SAA-722).
 * @param text - The full printable payload.
 * @param limit - The configured byte/line cap.
 * @returns {GraphIoCapResult} The capped text, whether anything was dropped, and its byte length.
 * @memberOf module:for-react.diagrams
 */
export function graphIoCapText(
  text: string,
  limit: GraphIoPanelLimit,
): GraphIoCapResult {
  let capped = text;
  let truncated = false;
  let bytes = text.length;
  if (typeof TextEncoder !== 'undefined' && limit.bytes > 0) {
    const encoded = new TextEncoder().encode(capped);
    if (encoded.length > limit.bytes) {
      capped = new TextDecoder().decode(encoded.slice(0, limit.bytes));
      truncated = true;
      bytes = new TextEncoder().encode(capped).length;
    } else {
      bytes = encoded.length;
    }
  }
  if (limit.lines > 0) {
    const lines = capped.split('\n');
    if (lines.length > limit.lines) {
      capped = lines.slice(0, limit.lines).join('\n');
      truncated = true;
      bytes =
        typeof TextEncoder !== 'undefined'
          ? new TextEncoder().encode(capped).length
          : capped.length;
    }
  }
  return { text: capped, truncated, bytes };
}
/**
 * @description Key stamped on payload objects whose content was capped for display, so consumers can tell truncated views apart from full payloads. SAA-1432 R3: the marker is namespaced so it cannot collide with a real payload key of the same name in a fallback export.
 * @summary Key stamped on payload objects whose content was capped for display, so consumers can tell truncated views apart from full payloads.
 * @category Graph
 * @memberOf module:for-react.diagrams
 */
export const GRAPH_IO_TRUNCATED_MARKER = '__graphIoTruncated';
/**
 * Substrings that identify a `TypeError` thrown by a failed fetch/transport
 * rather than by a client-side programming bug (SAA-1432 R4).
 */
const NETWORK_TYPE_ERROR_PATTERNS = [
  'failed to fetch',
  'fetch failed',
  'networkerror',
  'network error',
  'network request failed',
  'load failed',
  'connection refused',
  'connection reset',
  'connection closed',
  'socket hang up',
  'net::err_',
  'econnrefused',
  'econnreset',
  'econnaborted',
  'enotfound',
  'eai_again',
  'etimedout',
  'enetunreach',
  'err_network',
];
/**
 * Whether a `TypeError` carries a fetch/transport message, so a client-side
 * programming bug that also happens to be a `TypeError` is not misclassified as
 * a network failure (SAA-1432 R4).
 *
 * @param error - The `TypeError` to inspect.
 * @returns `true` when the message matches a known transport failure shape.
 */
function isNetworkTypeError(error: Error): boolean {
  if (error.name !== 'TypeError') return false;
  const message = (error.message ?? '').toLowerCase();
  return NETWORK_TYPE_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}
/**
 * @description Classifies an error as transport/backend-unavailability (name-, message-, or errno-based) rather than a data problem, so the viewer treats it as a recoverable fallback instead of surfacing a hard failure. `TypeError`s are narrowed to fetch/transport messages (SAA-1432 R4) so a client bug falls through to the announced `downloadError` path instead.
 * @summary Classifies an error as transport/backend-unavailability (name-, message-, or errno-based) rather than a data problem, so the viewer treats it as a recoverable fallback instead of surfacing a hard failure.
 * @param error - The thrown value to classify.
 * @returns `true` when the error looks like a network/backend availability problem.
 * @category Graph
 * @memberOf module:for-react.diagrams
 */
export function isNetworkClassError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (
    error.name === 'GraphBackendUnavailableError' ||
    error.name === 'NetworkError' ||
    error.name === 'AbortError' ||
    error.name === 'TimeoutError' ||
    isNetworkTypeError(error)
  ) {
    return true;
  }
  const code = (error as { code?: unknown }).code;
  return (
    typeof code === 'string' &&
    /^(ECONN|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ENETUNREACH|ERR_NETWORK)/.test(code)
  );
}
/**
 * @description Stamps a payload with {@link GRAPH_IO_TRUNCATED_MARKER} so downstream consumers know the rendered value was capped and the full content must be downloaded instead.
 * @summary Stamps a payload with {@link GRAPH_IO_TRUNCATED_MARKER} so downstream consumers know the rendered value was capped and the full content must be downloaded instead.
 * @param payload - The truncated payload (any shape).
 * @returns A shallow copy carrying the truncation marker.
 * @category Graph
 * @memberOf module:for-react.diagrams
 */
export function markDownloadFallback(payload: unknown): unknown {
  if (isRecord(payload)) {
    return { ...payload, [GRAPH_IO_TRUNCATED_MARKER]: true };
  }
  return { [GRAPH_IO_TRUNCATED_MARKER]: true, value: payload };
}
/**
 * @description Sanitizes a string for safe use as a download filename segment.
 * @summary Sanitizes a string for safe use as a download filename segment.
 * @param segment - Raw filename fragment (e.g. a node id).
 * @returns A filesystem-safe fragment, never empty.
 * @category Graph
 * @memberOf module:for-react.diagrams
 */
export function sanitizeFilenameSegment(segment: string): string {
  const sanitized = segment.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+/, '_');
  return sanitized || '_';
}

/**
 * One fully capped key/value row rendered in table mode.
 *
 * SAA-1432: both the key and the cell text are capped, each row reports its
 * rendered UTF-8 byte size, and `id` provides a render identity that stays
 * unique even when capped keys collide.
 */
interface GraphIoTableRow {
  /** Stable render identity for the `@for` track expression. */
  id: number;
  /** Capped display key. */
  key: string;
  /** Raw cell value, kept for empty-value checks. */
  value: unknown;
  /** Capped display text of the cell. */
  text: string;
  /** Whether the key was capped. */
  keyTruncated: boolean;
  /** Whether the cell text was capped. */
  textTruncated: boolean;
  /** Whether the key or the cell text was capped. */
  truncated: boolean;
  /** UTF-8 byte size of the rendered key and cell text. */
  bytes: number;
}

/**
 * @description One binary value found in a node's inputs or outputs.
 * @summary One binary value found in a node's inputs or outputs.
 * @memberOf module:for-react.diagrams
 */
export interface GraphIoBinaryEntry {
  /** Binary store id (`graph-binary:<digest>`). */
  id: string;
  /** Where the binary sits inside the rendered value. */
  path: string;
  fileName: string;
  mimeType: string;
  /** Human-readable size. */
  size: string;
  /** How the Binary tab previews the file inline. */
  preview: GraphIoBinaryPreview;
}

/**
 * @description Inline preview kind of a binary in the Binary tab.
 * @summary Inline preview kind of a binary in the Binary tab.
 * @memberOf module:for-react.diagrams
 */
export type GraphIoBinaryPreview = 'image' | 'audio' | 'video' | 'document' | 'none';

/**
 * @description Picks the inline preview for a media type. Only types the run binary endpoint serves inline get a preview; everything else is download-only.
 * @summary Picks the inline preview for a media type.  Only types the run binary endpoint serves inline get a preview; everything else is download-only.
 * @memberOf module:for-react.diagrams
 */
export function graphIoBinaryPreviewOf(mimeType: string): GraphIoBinaryPreview {
  const type = (mimeType || '').toLowerCase().split(';')[0].trim();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('audio/')) return 'audio';
  if (type.startsWith('video/')) return 'video';
  if (type === 'application/pdf' || type === 'application/json' || type.startsWith('text/')) {
    return 'document';
  }
  return 'none';
}

/**
 * @description Collects the store-backed binary references inside a value, once per stored file, with the path each one sits at.
 * @summary Collects the store-backed binary references inside a value, once per stored file, with the path each one sits at.
 * @param value - Node inputs/outputs or a workflow output value.
 * @returns One entry per distinct binary id.
 * @memberOf module:for-react.diagrams
 */
export function graphIoBinariesOf(value: unknown): GraphIoBinaryEntry[] {
  const found: GraphIoBinaryEntry[] = [];
  const seen = new Set<string>();
  const visit = (entry: unknown, path: string, depth: number): void => {
    if (isGraphBinaryReference(entry)) {
      if (!seen.has(entry.id)) {
        seen.add(entry.id);
        found.push({
          id: entry.id,
          path,
          fileName: entry.fileName || 'file',
          mimeType: entry.mimeType,
          size: formatGraphIoBytes(entry.byteLength),
          preview: graphIoBinaryPreviewOf(entry.mimeType),
        });
      }
      return;
    }
    if (depth > 8 || entry === null || typeof entry !== 'object') return;
    if (Array.isArray(entry)) {
      entry.forEach((item, index) => visit(item, `${path}[${index}]`, depth + 1));
      return;
    }
    for (const [key, item] of Object.entries(entry as Record<string, unknown>)) {
      visit(item, path ? `${path}.${key}` : key, depth + 1);
    }
  };
  visit(value, '', 0);
  return found;
}

/**
 * @description URL of a binary on the run binary endpoint (`GET /graph/runs/:runId/binary/:binaryId`), or `null` without a run.
 * @summary URL of a binary on the run binary endpoint (`GET /graph/runs/:runId/binary/:binaryId`), or `null` without a run.
 * @memberOf module:for-react.diagrams
 */
export function graphIoBinaryUrl(
  backendUrl: string,
  runId: string | null | undefined,
  entry: Pick<GraphIoBinaryEntry, 'id'>,
  action: 'view' | 'download',
): string | null {
  if (!runId) return null;
  return `${backendUrl}/graph/runs/${encodeURIComponent(runId)}/binary/${encodeURIComponent(entry.id)}?action=${action}`;
}

/**
 * @description Replaces binary values with a one-line placeholder for the JSON and table views (n8n keeps files out of the JSON view and shows them on a Binary tab). A reference collapses to `[binary] name · type · size`; an inline base64 payload never reaches the DOM. The raw view keeps the untouched value.
 * @summary Replaces binary values with a one-line placeholder for the JSON and table views (n8n keeps files out of the JSON view and shows them on a Binary tab).
 * @param value - The value to render.
 * @param depth - Recursion guard.
 * @returns The value with binaries replaced, or the same value when it has none.
 * @memberOf module:for-react.diagrams
 */
export function graphIoWithoutBinaries(value: unknown, depth = 0): unknown {
  if (isGraphBinaryReference(value) || isGraphBinaryPayload(value)) {
    const size = formatGraphIoBytes(value.byteLength);
    return `[binary] ${value.fileName || 'file'} · ${value.mimeType}${size ? ` · ${size}` : ''}`;
  }
  if (depth > 8 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((entry) => {
      const mapped = graphIoWithoutBinaries(entry, depth + 1);
      if (mapped !== entry) changed = true;
      return mapped;
    });
    return changed ? next : value;
  }
  let changed = false;
  const next: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const mapped = graphIoWithoutBinaries(entry, depth + 1);
    if (mapped !== entry) changed = true;
    next[key] = mapped;
  }
  return changed ? next : value;
}

/**
 * @description Formats a byte count for the binary list.
 * @summary Formats a byte count for the binary list.
 * @memberOf module:for-react.diagrams
 */
export function formatGraphIoBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Reusable read-only viewer for the node I/O inspection split view (DECAF-48
 * §4.6 / Req-9). Renders one arbitrary value with JSON (default), table or raw
 * representations, or the node error when the run failed. Both inspection
 * panes (right = inputs, left = outputs or error) share this component.
 *
 * SAA-722: rendering is capped ({@link GRAPH_IO_PANEL_LIMIT}) and a download
 * action fetches the entire untruncated payload from the server run detail
 * endpoint (`GET /graph/runs/:runId`).
 */
/**
 * @description Props accepted by the node I/O viewer.
 * @summary Props accepted by the node I/O viewer.
 * @memberOf module:for-react.diagrams
 */
export interface GraphIoViewerProps {
  title?: string;
  value?: unknown;
  error?: { name?: string; message?: string; stack?: string } | null;
  runId?: string;
  nodeId?: string;
  field?: GraphIoViewerField;
  backendUrl?: string;
  runClient?: GraphRunClient;
  limit?: GraphIoPanelLimit;
  initialMode?: GraphIoViewMode;
}

/**
 * @description Reusable read-only viewer for the node I/O inspection split view. Renders one arbitrary value with JSON (default), table, raw or binary representations, or the node error when the run failed. Rendering is capped and the full untruncated payload stays downloadable from the run detail endpoint.
 * @summary Reusable read-only viewer for the node I/O inspection split view.  Renders one arbitrary value with JSON (default), table, raw or binary representations, or the node error when the run failed.
 * @memberOf module:for-react.diagrams
 */
export function GraphIoViewerComponent({
  title = '',
  value,
  error = null,
  runId = '',
  nodeId = '',
  field = 'inputs',
  backendUrl = '',
  runClient,
  limit = GRAPH_IO_PANEL_LIMIT_DEFAULT,
  initialMode = 'json',
}: GraphIoViewerProps) {
  const [mode, setMode] = useState<GraphIoViewMode>(initialMode);
  const [downloadFallback, setDownloadFallback] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const binaries = useMemo(() => graphIoBinariesOf(value), [value]);
  const displayValue = useMemo(() => graphIoWithoutBinaries(value), [value]);
  const hasError = !!error;
  const errorMessage = error ? error.message || error.name || String(error) : '';
  const hasContents =
    value !== undefined && value !== null &&
    !(typeof value === 'object' && Object.keys(value as object).length === 0);
  const fullText = printable(value);
  const cappedText = useMemo(() => graphIoCapText(fullText, limit), [fullText, limit]);
  const cappedJsonText = useMemo(
    () => graphIoCapText(printable(displayValue), limit),
    [displayValue, limit]
  );

  const tableRows = useMemo<GraphIoTableRow[]>(() => {
    const toRow = (id: number, key: string, entry: unknown): GraphIoTableRow => {
      const cappedKey = graphIoCapText(key, limit);
      const cappedValue = graphIoCapText(printable(entry), limit);
      return {
        id,
        key: cappedKey.text,
        value: entry,
        text: cappedValue.text,
        keyTruncated: cappedKey.truncated,
        textTruncated: cappedValue.truncated,
        truncated: cappedKey.truncated || cappedValue.truncated,
        bytes: cappedKey.bytes + cappedValue.bytes,
      };
    };
    if (Array.isArray(displayValue)) {
      return displayValue.map((entry, index) => toRow(index, `[${index}]`, entry));
    }
    if (isRecord(displayValue)) {
      return Object.entries(displayValue).map(([key, entry], index) => toRow(index, key, entry));
    }
    return [toRow(0, title, displayValue)];
  }, [displayValue, limit, title]);

  const visibleTableRows = useMemo(() => {
    const maxRows = limit.lines > 0 ? limit.lines : tableRows.length;
    const budget = limit.bytes;
    const visible: GraphIoTableRow[] = [];
    let used = 0;
    for (const row of tableRows) {
      if (visible.length >= maxRows) break;
      if (budget > 0) {
        const remaining = budget - used;
        if (remaining <= 0) break;
        if (row.bytes > remaining) break;
      }
      visible.push(row);
      used += row.bytes;
    }
    return visible;
  }, [tableRows, limit]);

  const isTruncated =
    (mode === 'raw' ? cappedText.truncated : cappedJsonText.truncated) ||
    tableRows.length > visibleTableRows.length ||
    visibleTableRows.some((row) => row.truncated);

  const binaryUrl = (entry: GraphIoBinaryEntry, action: 'view' | 'download'): string | null =>
    graphIoBinaryUrl(backendUrl, runId, entry, action);

  const download = async (): Promise<void> => {
    if (!runId || !nodeId || typeof document === 'undefined' || typeof URL === 'undefined') return;
    setDownloadFallback(false);
    setDownloadError(null);
    let payload: unknown = value;
    let fellBack = !runClient;
    if (runClient) {
      try {
        const result = await runClient.getRunResult(runId);
        const serverPayload = result?.nodeResults?.[nodeId]?.[field];
        if (serverPayload !== undefined) payload = serverPayload;
        else fellBack = true;
      } catch (err) {
        if (!isNetworkClassError(err)) {
          setDownloadError(err instanceof Error ? err.message : 'Could not fetch the full payload.');
          return;
        }
        fellBack = true;
      }
    }
    if (fellBack) {
      setDownloadFallback(true);
      payload = markDownloadFallback(payload);
    }
    const text = typeof payload === 'string' ? payload : printable(payload);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${sanitizeFilenameSegment(field)}-${sanitizeFilenameSegment(nodeId)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="graph-io-viewer" aria-label={title || field}>
      <header className="graph-io-viewer__header">
        <h4 className="graph-io-viewer__title">{title}</h4>
        <div className="graph-io-viewer__modes" role="tablist" aria-label="View mode">
          {GRAPH_IO_VIEW_MODES.map((entry) => (
            <button
              key={entry}
              type="button"
              role="tab"
              aria-selected={mode === entry}
              className={`graph-io-viewer__mode${mode === entry ? ' graph-io-viewer__mode--active' : ''}`}
              disabled={entry === 'binary' && binaries.length === 0}
              onClick={() => setMode(entry)}
            >
              {entry === 'binary' && binaries.length ? `binary (${binaries.length})` : entry}
            </button>
          ))}
        </div>
        {runId && nodeId ? (
          <button type="button" className="graph-io-viewer__download" onClick={() => void download()}>
            Download
          </button>
        ) : null}
      </header>
      {hasError ? (
        <div className="graph-io-viewer__error" role="alert">
          <strong>{error?.name || 'Error'}</strong>
          <p>{errorMessage}</p>
          {error?.stack ? <pre>{error.stack}</pre> : null}
        </div>
      ) : !hasContents ? (
        <p className="graph-io-viewer__empty">No data.</p>
      ) : mode === 'table' ? (
        <table className="graph-io-viewer__table">
          <tbody>
            {visibleTableRows.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.key}</th>
                <td>{row.value === undefined || row.value === null || row.value === '' ? '—' : row.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : mode === 'binary' ? (
        <ul className="graph-io-viewer__binaries">
          {binaries.map((entry) => (
            <li key={entry.id}>
              <span>{entry.fileName}</span>
              {binaryUrl(entry, 'view') ? <a href={binaryUrl(entry, 'view') as string} target="_blank" rel="noreferrer">View</a> : null}
              {binaryUrl(entry, 'download') ? <a href={binaryUrl(entry, 'download') as string}>Download</a> : null}
            </li>
          ))}
        </ul>
      ) : (
        <pre className="graph-io-viewer__text">{mode === 'raw' ? cappedText.text : cappedJsonText.text}</pre>
      )}
      {isTruncated ? (
        <p className="graph-io-viewer__truncation" role="status">
          Output truncated to {Math.round(limit.bytes / 1024)} KB / {limit.lines} lines.
        </p>
      ) : null}
      {downloadFallback ? (
        <p className="graph-io-viewer__fallback" role="status">
          The full payload could not be fetched; the download carries the {GRAPH_IO_TRUNCATED_MARKER} marker.
        </p>
      ) : null}
      {downloadError ? (
        <p className="graph-io-viewer__download-error" role="alert">{downloadError}</p>
      ) : null}
    </section>
  );
}

export default GraphIoViewerComponent;

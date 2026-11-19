/**
 * @note Adapted to for-react from the for-angular io-viewer, logs-widget, node-inspection and condition-editor specs.
 *
 * @module for-react/graph/graph-panels.spec
 * @summary Node I/O viewer, run-log console, node inspection and condition
 * editor React/RTL contract.
 * @description Covers the framework-agnostic helpers 1:1 (render caps, network
 * classification, download fallback marker, filename sanitization, binary
 * preview/collapse) and the rendered panes the Angular suite asserted: capped
 * JSON/table output with a truncation notice, the run-scoped download gate, the
 * on-demand log drawer with level filtering, the input/output inspection split,
 * and the condition editor's JSON validation.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

import {
  GraphIoViewerComponent,
  graphIoCapText,
  isNetworkClassError,
  markDownloadFallback,
  sanitizeFilenameSegment,
  graphIoWithoutBinaries,
  graphIoBinaryPreviewOf,
  GRAPH_IO_TRUNCATED_MARKER,
} from '../../../src/diagrams/components/graph/graph-io-viewer.component';
import { GraphLogsWidgetComponent } from '../../../src/diagrams/components/graph/graph-logs-widget.component';
import { GraphNodeInspectionComponent } from '../../../src/diagrams/components/graph/GraphNodeInspection';
import { GraphConditionEditorComponent } from '../../../src/diagrams/components/graph/GraphConditionEditor';
import { graphRunLog } from '../../../src/diagrams/execution/GraphRunLogStore';
import { graphInspection } from '../../../src/diagrams/execution/GraphInspectionStore';
import { GraphBackendUnavailableError } from '../../../src/diagrams/execution/GraphExecutionService';
import type { GraphIoPanelLimit } from '../../../src/diagrams/internal/config';

const LIMIT: GraphIoPanelLimit = { bytes: 100, lines: 10 };

describe('graphIoCapText', () => {
  it('returns the full text unchanged when it is under both caps', () => {
    const result = graphIoCapText('hello', { bytes: 100, lines: 10 });
    expect(result).toMatchObject({ text: 'hello', truncated: false });
  });

  it('does not flag truncation when the byte count exactly equals the cap', () => {
    const result = graphIoCapText('abcde', { bytes: 5, lines: 10 });
    expect(result).toMatchObject({ text: 'abcde', truncated: false, bytes: 5 });
  });

  it('applies the byte cap and flags truncation when the payload is too large', () => {
    const result = graphIoCapText('abcdefghij', { bytes: 5, lines: 10 });
    expect(result.truncated).toBe(true);
    expect(result.text).toBe('abcde');
  });

  it('applies the line cap and flags truncation when there are too many lines', () => {
    const result = graphIoCapText('a\nb\nc\nd', { bytes: 0, lines: 2 });
    expect(result).toMatchObject({ text: 'a\nb', truncated: true });
  });

  it('reports UTF-8 byte length, not string length, for a multi-byte payload', () => {
    const result = graphIoCapText('é', { bytes: 1000, lines: 100 });
    expect(result.text).toBe('é');
    expect(result.bytes).toBe(2);
  });

  it('never mutates the source text', () => {
    const text = 'abcdefghij';
    graphIoCapText(text, { bytes: 5, lines: 0 });
    expect(text).toBe('abcdefghij');
  });
});

describe('isNetworkClassError', () => {
  it('is true for the graph backend unavailability error', () => {
    expect(isNetworkClassError(new GraphBackendUnavailableError())).toBe(true);
  });

  it('is false for a plain Error and non-Error rejection values', () => {
    expect(isNetworkClassError(new Error('boom'))).toBe(false);
    expect(isNetworkClassError('boom')).toBe(false);
    expect(isNetworkClassError(undefined)).toBe(false);
  });

  it('classifies transport-shaped TypeErrors but not client-bug TypeErrors', () => {
    expect(isNetworkClassError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkClassError(new TypeError('Cannot read properties of undefined'))).toBe(false);
  });
});

describe('markDownloadFallback', () => {
  it('merges the marker into a record payload', () => {
    expect(markDownloadFallback({ a: 1 })).toMatchObject({ a: 1, [GRAPH_IO_TRUNCATED_MARKER]: true });
  });

  it('wraps a non-record payload in a marker envelope', () => {
    expect(markDownloadFallback('text')).toMatchObject({
      value: 'text',
      [GRAPH_IO_TRUNCATED_MARKER]: true,
    });
  });

  it('wraps an array rather than annotating it', () => {
    const marked = markDownloadFallback([1, 2]) as Record<string, unknown>;
    expect(Array.isArray(marked)).toBe(false);
    expect(marked).toMatchObject({ value: [1, 2], [GRAPH_IO_TRUNCATED_MARKER]: true });
  });

  it('does not mutate the source payload', () => {
    const source = { a: 1 };
    markDownloadFallback(source);
    expect(source).toEqual({ a: 1 });
  });
});

describe('sanitizeFilenameSegment', () => {
  it('collapses path traversal out of a hostile id', () => {
    const segment = sanitizeFilenameSegment('../../etc/passwd');
    // Path traversal needs separators or a leading dot segment; the sanitizer
    // removes both so the fragment can never escape the download directory.
    expect(segment).not.toContain('/');
    expect(segment).not.toContain('\\');
    expect(segment.startsWith('.')).toBe(false);
  });

  it('keeps a benign segment intact', () => {
    expect(sanitizeFilenameSegment('node-1')).toBe('node-1');
  });
});

describe('binary value helpers', () => {
  const binary = {
    __graphBinary: true,
    id: 'graph-binary:abc',
    fileName: 'photo.png',
    mimeType: 'image/png',
    byteLength: 2048,
  };

  it('maps media types to preview kinds', () => {
    expect(graphIoBinaryPreviewOf('image/png')).toBe('image');
    expect(graphIoBinaryPreviewOf('audio/mpeg')).toBe('audio');
    expect(graphIoBinaryPreviewOf('video/mp4')).toBe('video');
    expect(graphIoBinaryPreviewOf('application/pdf')).toBe('document');
    expect(graphIoBinaryPreviewOf('application/octet-stream')).toBe('none');
  });

  it('collapses inline binary payloads so the bytes never reach the DOM', () => {
    const collapsed = graphIoWithoutBinaries({ file: binary }) as Record<string, string>;
    expect(collapsed.file).toContain('[binary] photo.png');
    expect(collapsed.file).not.toContain('base64');
  });

  it('returns the same value when it holds no binaries', () => {
    const value = { a: 1 };
    expect(graphIoWithoutBinaries(value)).toBe(value);
  });
});

describe('GraphIoViewerComponent — rendering and caps', () => {
  it('renders the JSON payload and the mode tabs', () => {
    render(<GraphIoViewerComponent title="Inputs" value={{ a: 1 }} />);
    expect(screen.getByRole('heading', { name: 'Inputs' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'json' })).toHaveAttribute('aria-selected', 'true');
    expect(document.querySelector('.graph-io-viewer__text')).toHaveTextContent('"a": 1');
  });

  it('renders the empty state when there is no data', () => {
    render(<GraphIoViewerComponent title="Inputs" value={null} />);
    expect(screen.getByText('No data.')).toBeInTheDocument();
  });

  it('renders the node error pane with the error message', () => {
    render(
      <GraphIoViewerComponent
        title="Error"
        value={{ name: 'Boom' }}
        error={{ name: 'Boom', message: 'The node exploded' }}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('The node exploded');
  });

  it('caps the raw text and renders the truncation notice when the byte cap binds', () => {
    render(<GraphIoViewerComponent title="Inputs" value={'x'.repeat(200)} limit={LIMIT} initialMode="raw" />);
    expect(screen.getByRole('status')).toHaveTextContent('Output truncated');
  });

  it('renders the visible table rows in table mode', () => {
    render(<GraphIoViewerComponent title="Inputs" value={{ a: 1, b: 2 }} limit={LIMIT} />);
    fireEvent.click(screen.getByRole('tab', { name: 'table' }));
    expect(document.querySelector('.graph-io-viewer__table')).not.toBeNull();
    expect(screen.getByRole('rowheader', { name: 'a' })).toBeInTheDocument();
  });

  it('requires BOTH runId and nodeId to enable the download action', () => {
    const { rerender } = render(<GraphIoViewerComponent title="Inputs" value={{ a: 1 }} runId="run-1" />);
    expect(document.querySelector('.graph-io-viewer__download')).toBeNull();
    rerender(<GraphIoViewerComponent title="Inputs" value={{ a: 1 }} runId="run-1" nodeId="node-1" />);
    expect(document.querySelector('.graph-io-viewer__download')).not.toBeNull();
  });

  it('offers a binary tab labelled with the file count and lists the file', () => {
    const value = {
      file: {
        __graphBinary: true,
        id: 'graph-binary:abc',
        fileName: 'photo.png',
        mimeType: 'image/png',
        byteLength: 2048,
      },
    };
    render(<GraphIoViewerComponent title="Inputs" value={value} runId="run-1" nodeId="node-1" backendUrl="http://backend" />);
    const binaryTab = screen.getByRole('tab', { name: 'binary (1)' });
    fireEvent.click(binaryTab);
    expect(screen.getByText('photo.png')).toBeInTheDocument();
    expect(screen.getByText('View')).toHaveAttribute('href', expect.stringContaining('/graph/runs/run-1/binary/'));
  });
});

describe('GraphLogsWidgetComponent — docked drawer', () => {
  beforeEach(() => {
    act(() => graphRunLog.reset());
  });

  it('renders only the open affordance while the drawer is closed', () => {
    render(<GraphLogsWidgetComponent />);
    expect(screen.getAllByRole('button', { name: 'Open run log' }).length).toBeGreaterThan(0);
    expect(document.querySelector('.graph-logs-dock')).not.toHaveClass('graph-logs-dock--open');
  });

  it('opens on demand with zero entries and shows the empty state', () => {
    render(<GraphLogsWidgetComponent />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Open run log' })[0]);
    expect(screen.getByText('No run messages yet.')).toBeInTheDocument();
  });

  it('renders run-lifecycle lines even with zero entries', () => {
    act(() => {
      graphRunLog.setOpen(true);
      graphRunLog.recordLifecycle('created', 'Run created');
    });
    render(<GraphLogsWidgetComponent />);
    expect(screen.getByText('Run created')).toBeInTheDocument();
  });

  it('renders streamed entries, filters them and clears them', () => {
    act(() => {
      graphRunLog.setOpen(true);
      graphRunLog.append({ level: 'info', message: 'hello info', timestamp: '2026-01-01T00:00:00.000Z' } as never);
      graphRunLog.append({ level: 'error', message: 'boom error', timestamp: '2026-01-01T00:00:01.000Z' } as never);
    });
    render(<GraphLogsWidgetComponent />);
    expect(screen.getByText('hello info')).toBeInTheDocument();
    expect(screen.getByText('boom error')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Errors' }));
    expect(screen.queryByText('hello info')).not.toBeInTheDocument();
    expect(screen.getByText('boom error')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByText('boom error')).not.toBeInTheDocument();
  });

  it('dismisses back to the open affordance', () => {
    act(() => graphRunLog.setOpen(true));
    render(<GraphLogsWidgetComponent />);
    fireEvent.click(screen.getByTitle('Dismiss console'));
    expect(document.querySelector('.graph-logs-dock')).not.toHaveClass('graph-logs-dock--open');
  });
});

describe('GraphNodeInspectionComponent', () => {
  beforeEach(() => {
    act(() => graphInspection.reset());
  });

  it('renders nothing without an active node', () => {
    const { container } = render(<GraphNodeInspectionComponent nodeId={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the input/output split for the inspected node', () => {
    render(
      <GraphNodeInspectionComponent
        nodeId="node-1"
        payload={{ nodeId: 'node-1', inputs: { a: 1 }, outputs: { b: 2 } } as never}
      />
    );
    expect(screen.getByRole('region', { name: 'Node node-1 inspection' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Inputs' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Outputs' })).toBeInTheDocument();
  });

  it('renders the error pane instead of outputs when the node failed', () => {
    render(
      <GraphNodeInspectionComponent
        nodeId="node-1"
        payload={{ nodeId: 'node-1', inputs: {}, error: { name: 'Boom', message: 'failed' } } as never}
      />
    );
    expect(screen.getByRole('heading', { name: 'Error' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('failed');
  });

  it('reads the payload from the shared inspection store when none is provided', () => {
    act(() => {
      graphInspection.set({ nodeId: 'node-2', inputs: { value: 7 }, outputs: { done: true } } as never);
      graphInspection.open('node-2');
    });
    render(<GraphNodeInspectionComponent />);
    expect(screen.getByRole('region', { name: 'Node node-2 inspection' })).toBeInTheDocument();
  });

  it('renders a close control and invokes it', () => {
    const onClose = jest.fn();
    render(<GraphNodeInspectionComponent nodeId="node-1" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close inspection' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('GraphConditionEditorComponent', () => {
  it('seeds the textarea from the current expression', () => {
    render(<GraphConditionEditorComponent value={{ op: 'eq' } as never} />);
    expect(screen.getByRole('textbox', { name: 'Condition expression' })).toHaveValue(
      JSON.stringify({ op: 'eq' }, null, 2)
    );
  });

  it('emits the parsed expression for valid JSON', () => {
    const onChange = jest.fn();
    render(<GraphConditionEditorComponent onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Condition expression' }), {
      target: { value: '{"op":"eq","right":{"const":1}}' },
    });
    expect(onChange).toHaveBeenCalledWith({ op: 'eq', right: { const: 1 } });
  });

  it('surfaces a validation error for malformed JSON and does not emit', () => {
    const onChange = jest.fn();
    render(<GraphConditionEditorComponent onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Condition expression' }), {
      target: { value: '{not json' },
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('emits null for a blank expression', () => {
    const onChange = jest.fn();
    render(<GraphConditionEditorComponent value={{ op: 'eq' } as never} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Condition expression' }), {
      target: { value: '   ' },
    });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('honours the disabled state', () => {
    render(<GraphConditionEditorComponent disabled />);
    expect(screen.getByRole('textbox', { name: 'Condition expression' })).toBeDisabled();
  });
});

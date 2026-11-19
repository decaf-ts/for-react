/**
 * @module for-react/diagrams/components/graph-port-field/graph-port-value
 * @summary Value-mode resolution for the node CRUD surfaces (DECAF-50 §4.22,
 * §13 "Value input modes" / "Gating").
 * @description Resolves which value-input modes an `@input` port may offer, the
 * persisted `GraphValueTemplate` language for the chosen mode, and builds the
 * canonical document patch (input binding + `GraphValueTemplate` parameter) the
 * edit surfaces dispatch through `GraphWorkflowDocumentStore.updateNode`.
 *
 * The mode vocabulary is the editor face of the persisted
 * `GraphValueTemplate` contract (as-graph §0.2 R7): `literal` is a fixed value,
 * `expression` is code evaluated by the code sandbox, `template` is a
 * placeholder string, and `formula` is the reserved (not-yet-implemented) formula
 * button. `port` keeps the value coming from an incoming edge. Which of these are
 * offered is gated by the model's own metadata — the port's
 * `graph.userControlled` / `configurable` contract and its
 * `element`/`type` code capability — never hardcoded per node.
 */
import {
  PortDirection,
  type GraphInputBinding,
  type GraphJsonValue,
  type GraphPortDefinition,
  type GraphValueTemplate,
  type GraphValueTemplateLanguage,
  type GraphValueTemplateMode,
} from '@decaf-ts/as-graph/shared';

/**
 * @description The value-input modes an editor surface may offer for one input port.
 * @summary The value-input modes an editor surface may offer for one input port.
 * @memberOf module:for-react.diagrams
 */
export type GraphPortValueMode = 'port' | 'literal' | 'expression' | 'template' | 'formula';

/** Manifest element tags that mark a port as a code editor surface. */
const GRAPH_CODE_EDITOR_TAGS = new Set(['code-editor', 'formula-editor']);

/** Manifest port types that mark a port as a code/expression surface. */
const GRAPH_CODE_PORT_TYPES = new Set(['code', 'expression', 'javascript', 'typescript']);

/**
 * @description Whether the port carries a code-capable editor surface (a `code-editor` / `formula-editor` element or a code/expression port type). Such ports offer the `expression`/`template`/`formula` value modes in addition to the base ones.
 * @summary Whether the port carries a code-capable editor surface (a `code-editor` / `formula-editor` element or a code/expression port type).
 * @memberOf module:for-react.diagrams
 */
export function graphPortSupportsCode(port: GraphPortDefinition | undefined): boolean {
  if (!port) return false;
  const tag = (port.element as { tag?: string } | undefined)?.tag;
  if (tag && GRAPH_CODE_EDITOR_TAGS.has(tag)) return true;
  return GRAPH_CODE_PORT_TYPES.has(String(port.type ?? '').toLowerCase());
}

/**
 * @description Whether the port is user-controllable (DECAF-50 node rules R5 #3): declared with BOTH `@uielement` and `@input`, or explicitly `configurable`. Such ports may be delegated to an incoming edge or filled with a user-defined value, so the editor offers the `port` mode in addition to the value modes.
 * @summary Whether the port is user-controllable (DECAF-50 node rules R5 #3): declared with BOTH `@uielement` and `@input`, or explicitly `configurable`.
 * @memberOf module:for-react.diagrams
 */
export function graphPortUserControlled(port: GraphPortDefinition | undefined): boolean {
  return port?.graph?.userControlled === true;
}

/**
 * @description Resolves the value modes an `@input` port may offer, gated by the model's metadata (§13 "Gating"): a user-controllable port may be delegated to an edge (`port`) or filled with a value; a code-capable port additionally offers the `expression`/`template`/`formula` value modes; a plain port only offers `literal`. Output ports never expose value modes.
 * @summary Resolves the value modes an `@input` port may offer, gated by the model's metadata (§13 "Gating"): a user-controllable port may be delegated to an edge (`port`) or filled with a value; a code-capable port additionally of
 * @memberOf module:for-react.diagrams
 */
export function graphPortValueModesOf(port: GraphPortDefinition | undefined): GraphPortValueMode[] {
  if (!port || port.direction !== PortDirection.INPUT) return ['literal'];
  const modes: GraphPortValueMode[] = ['port', 'literal'];
  if (graphPortSupportsCode(port)) {
    modes.push('expression', 'template', 'formula');
  }
  return modes;
}

/**
 * @description Resolves the default value mode for a port from its metadata: a code-capable port defaults to the `expression` editor, a delegated user-controlled port defaults to the edge (`port`) mode, and every other input defaults to `literal`.
 * @summary Resolves the default value mode for a port from its metadata: a code-capable port defaults to the `expression` editor, a delegated user-controlled port defaults to the edge (`port`) mode, and every other input defaults t
 * @memberOf module:for-react.diagrams
 */
export function graphPortDefaultValueMode(port: GraphPortDefinition | undefined): GraphPortValueMode {
  if (graphPortSupportsCode(port)) return 'expression';
  if (graphPortUserControlled(port)) return 'port';
  return 'literal';
}

/**
 * @description Resolves the persisted `GraphValueTemplate` language for one value mode (§13 mapping): `template` → `text`, `expression`/`formula` → `javascript` (or `typescript` when the port's manifest type says so).
 * @summary Resolves the persisted `GraphValueTemplate` language for one value mode (§13 mapping): `template` → `text`, `expression`/`formula` → `javascript` (or `typescript` when the port's manifest type says so).
 * @memberOf module:for-react.diagrams
 */
export function graphPortValueTemplateLanguageOf(
  mode: GraphPortValueMode,
  port: GraphPortDefinition | undefined
): GraphValueTemplateLanguage {
  if (mode === 'template') return 'text';
  if (mode === 'expression' || mode === 'formula') {
    const type = String(port?.type ?? '').toLowerCase();
    return type === 'typescript' ? 'typescript' : 'javascript';
  }
  return 'javascript';
}

/**
 * @description The persisted `GraphValueTemplate` mode for a value mode, or `null` when the mode is not persisted as a template (`port`/`literal`). `formula` is persisted as an `expression` template carrying the `metadata.formula` marker until the formula evaluator ships (§13 formula button).
 * @summary The persisted `GraphValueTemplate` mode for a value mode, or `null` when the mode is not persisted as a template (`port`/`literal`).
 * @memberOf module:for-react.diagrams
 */
export function graphValueTemplateModeOf(mode: GraphPortValueMode): GraphValueTemplateMode | null {
  if (mode === 'expression' || mode === 'formula') return 'expression';
  if (mode === 'template') return 'template';
  return null;
}

/**
 * @description Builds the persisted `GraphValueTemplate` for one value mode, or `null` when the mode is a `port`/`literal` (which are persisted on the binding, not as a template). A `formula` mode persists an `expression` template carrying the `metadata.formula` marker.
 * @summary Builds the persisted `GraphValueTemplate` for one value mode, or `null` when the mode is a `port`/`literal` (which are persisted on the binding, not as a template).
 * @memberOf module:for-react.diagrams
 */
export function graphValueTemplateOf(
  mode: GraphPortValueMode,
  body: string,
  port: GraphPortDefinition | undefined
): GraphValueTemplate | null {
  const templateMode = graphValueTemplateModeOf(mode);
  if (!templateMode) return null;
  const language = graphPortValueTemplateLanguageOf(mode, port);
  const template: GraphValueTemplate = { mode: templateMode, expression: body, language };
  if (mode === 'formula') {
    template.metadata = { formula: 'true' };
  }
  return template;
}

/**
 * @description Whether a persisted parameter value is a `GraphValueTemplate`. Used to seed the edit surfaces with an existing expression/template value.
 * @summary Whether a persisted parameter value is a `GraphValueTemplate`.  Used to seed the edit surfaces with an existing expression/template value.
 * @return {boolean} `true` when the value is a GraphValueTemplate.
 * @memberOf module:for-react.diagrams
 */
export function isGraphValueTemplateValue(value: unknown): value is GraphValueTemplate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    (record['mode'] === 'expression' || record['mode'] === 'template') &&
    typeof record['expression'] === 'string'
  );
}

/**
 * @description Whether a `parameters[portId]` entry is a plain configured value — what a workflow authored in code or a backend demo stores for a user-controlled input (`{ operation: "write" }`) — rather than a `GraphValueTemplate`.
 * @summary Whether a `parameters[portId]` entry is a plain configured value — what a workflow authored in code or a backend demo stores for a user-controlled input (`{ operation: "write" }`) — rather than a `GraphValueTemplate`.
 * @memberOf module:for-react.diagrams
 */
export function isGraphPlainParameterValue(value: unknown): boolean {
  return value !== undefined && value !== null && !isGraphValueTemplateValue(value);
}

/**
 * @description Resolves the value mode for one port from its current binding / parameter. The persisted `GraphValueTemplate` in `parameters[portId]` wins over the binding; a literal/expression binding resolves to its own mode; a plain configured value in `parameters[portId]` is a literal; otherwise the port default applies.
 * @summary Resolves the value mode for one port from its current binding / parameter.
 * @memberOf module:for-react.diagrams
 */
export function graphPortValueModeOf(
  port: GraphPortDefinition | undefined,
  binding: GraphInputBinding | undefined,
  parameterValue: unknown
): GraphPortValueMode {
  if (isGraphValueTemplateValue(parameterValue)) {
    const templateMode = parameterValue.mode;
    if (templateMode === 'template') return 'template';
    return parameterValue.metadata?.['formula'] === 'true' ? 'formula' : 'expression';
  }
  if (binding?.mode === 'edge') return 'port';
  if (binding?.mode === 'expression') return 'expression';
  if (binding?.mode === 'literal') return 'literal';
  if (isGraphPlainParameterValue(parameterValue)) return 'literal';
  return graphPortDefaultValueMode(port);
}

/** Renders a configured value as editable text: strings as-is, the rest as JSON. */
function graphPortValueText(value: unknown): string {
  if (value === undefined || value === null) return '';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/**
 * @description Reads the editable body for one port from its current binding / parameter. Expression/template parameters win; literal bindings fall back to their value; without a binding, a plain configured `parameters[portId]` value is shown (strings as-is, numbers/booleans/objects as JSON).
 * @summary Reads the editable body for one port from its current binding / parameter.
 * @memberOf module:for-react.diagrams
 */
export function graphPortValueBodyOf(
  binding: GraphInputBinding | undefined,
  parameterValue: unknown
): string {
  if (isGraphValueTemplateValue(parameterValue)) return parameterValue.expression;
  if (binding?.mode === 'literal') {
    const value = (binding as unknown as { value?: unknown }).value;
    return graphPortValueText(value);
  }
  if (binding?.mode === 'expression') {
    const expression = (binding as unknown as { expression?: unknown }).expression;
    return expression === undefined ? '' : String(expression);
  }
  if (!binding && isGraphPlainParameterValue(parameterValue)) {
    return graphPortValueText(parameterValue);
  }
  return '';
}

/**
 * @description Converts an edited literal body back to the JSON type of the configured value it replaces: a string stays text; a number, boolean, array or object is parsed back from its JSON text (falling back to the text when it no longer parses).
 * @summary Converts an edited literal body back to the JSON type of the configured value it replaces: a string stays text; a number, boolean, array or object is parsed back from its JSON text (falling back to the text when it no lo
 * @param body - The edited text.
 * @param previous - The plain `parameters[portId]` value being replaced.
 * @return The value to persist.
 * @memberOf module:for-react.diagrams
 */
export function graphPortLiteralValueOf(body: string, previous: unknown): GraphJsonValue {
  if (previous === undefined || previous === null || typeof previous === 'string') {
    return body as GraphJsonValue;
  }
  try {
    return JSON.parse(body) as GraphJsonValue;
  } catch {
    return body as GraphJsonValue;
  }
}

/**
 * @description Builds the canonical document patch for one input port: the `inputBindings` entry (edge/literal/expression) plus, for expression/template/formula modes, the persisted `GraphValueTemplate` in `parameters`. A `port` mode produces only the edge binding.
 * @summary Builds the canonical document patch for one input port: the `inputBindings` entry (edge/literal/expression) plus, for expression/template/formula modes, the persisted `GraphValueTemplate` in `parameters`.
 * @memberOf module:for-react.diagrams
 */
export function graphPortValuePatchOf(
  port: GraphPortDefinition | undefined,
  mode: GraphPortValueMode,
  body: string
): { binding?: GraphInputBinding; template?: GraphValueTemplate } {
  if (!port) return {};
  const portId = port.path || port.property;
  if (!portId) return {};
  if (mode === 'port') {
    return { binding: { mode: 'edge' } };
  }
  if (mode === 'literal') {
    return { binding: { mode: 'literal', value: body as GraphJsonValue } };
  }
  const template = graphValueTemplateOf(mode, body, port);
  if (mode === 'expression') {
    return { binding: { mode: 'expression', expression: body }, template: template ?? undefined };
  }
  return { template: template ?? undefined };
}

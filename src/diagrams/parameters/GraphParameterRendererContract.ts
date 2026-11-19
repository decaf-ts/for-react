import type {
  GraphCredentialReference,
  GraphJsonValue,
  GraphNodeInstance,
  GraphNodeManifest,
  GraphParameterDefinition,
} from '@decaf-ts/as-graph/shared';

/**
 * @description A parameter value: any JSON value, or `undefined` while unset.
 * @summary A parameter value: any JSON value, or `undefined` while unset.
 * @memberOf module:for-react.diagrams
 */
export type GraphJsonValueOrUndefined = GraphJsonValue | undefined;

/**
 * @description A validation issue for one parameter value, from manifest validation rules or intrinsic type checks.
 * @summary A validation issue for one parameter value, from manifest validation rules or intrinsic type checks.
 * @memberOf module:for-react.diagrams
 */
export interface GraphParameterValueIssue {
  parameterId: string;
  message: string;
  path?: string;
  level: 'error' | 'warning';
}

/**
 * @description Context handed to parameter renderers: the node, its manifest, current values, and option-loading callbacks.
 * @summary Context handed to parameter renderers: the node, its manifest, current values, and option-loading callbacks.
 * @memberOf module:for-react.diagrams
 */
export interface GraphParameterFormContext {
  node: GraphNodeInstance;
  manifest: GraphNodeManifest;
  values: Record<string, GraphJsonValueOrUndefined>;
  credentialOptions?: GraphCredentialReference[];
  loadOptions?: (
    parameter: GraphParameterDefinition,
    request: Record<string, GraphJsonValue>
  ) => Promise<GraphJsonValue>;
}

/**
 * @description Props every schema-driven parameter renderer component implements: the parameter definition, its current value, disabled state, form context, and the change/error callbacks the field dispatcher listens to.
 * @summary Props every schema-driven parameter renderer component implements: the parameter definition, its current value, disabled state, form context, and the change/error callbacks the field dispatcher listens to.
 * @memberOf module:for-react.diagrams
 */
export interface GraphParameterRendererContract {
  parameter: GraphParameterDefinition;
  value: GraphJsonValueOrUndefined;
  disabled?: boolean;
  context?: GraphParameterFormContext;
  onValueChange: (value: GraphJsonValueOrUndefined) => void;
  onErrorChange?: (issues: GraphParameterValueIssue[]) => void;
}

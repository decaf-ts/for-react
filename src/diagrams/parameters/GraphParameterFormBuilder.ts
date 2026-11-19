import type {
  GraphJsonValue,
  GraphNodeInstance,
  GraphNodeManifest,
  GraphParameterDefinition,
} from '@decaf-ts/as-graph/shared';
import { graphParameterValidationIssuesOf } from './GraphParameterValidationMapper.js';
import { graphParameterVisibilityOf } from './GraphParameterVisibilityEvaluator.js';
import type { GraphParameterValueIssue } from './GraphParameterRendererContract.js';

/**
 * @description One manifest parameter's resolved form state: definition, current value, visibility, and disabled flag.
 * @summary One manifest parameter's resolved form state: definition, current value, visibility, and disabled flag.
 * @memberOf module:for-react.diagrams
 */
export interface GraphParameterField {
  parameter: GraphParameterDefinition;
  value: GraphJsonValue | undefined;
  visible: boolean;
  disabled: boolean;
}

/**
 * @description Built form state for a node's parameters: fields, rendered set, values, issues, and dynamic-option ids.
 * @summary Built form state for a node's parameters: fields, rendered set, values, issues, and dynamic-option ids.
 * @memberOf module:for-react.diagrams
 */
export interface GraphParameterFormState {
  /** Every manifest parameter, in manifest order. */
  fields: GraphParameterField[];
  /** Parameters rendered into the form (visible entries, minus the hidden type). */
  renderedParameters: GraphParameterDefinition[];
  /** JSON value per parameter, including verbatim preserved hidden values. */
  values: Record<string, GraphJsonValue | undefined>;
  /** Validation issues per parameter id, from the rendered fields only. */
  issues: Record<string, GraphParameterValueIssue[]>;
  /** Parameters declaring `loadOptionsMethod` whose options must be loaded dynamically. */
  dynamicOptionsParameters: string[];
}

/**
 * @description Builds schema-driven parameter form state (DECAF-50 §4.12): expands a node's manifest parameters into ordered fields with resolved values, visibility (§4.6), disabled state, validation issues, and dynamic-option discovery for `options` parameters that declare `loadOptionsMethod`. Hidden values are preserved verbatim.
 * @summary Builds schema-driven parameter form state (DECAF-50 §4.12): expands a node's manifest parameters into ordered fields with resolved values, visibility (§4.6), disabled state, validation issues, and dynamic-option discovery for `options` parameters that declare `loadOptionsMethod`.
 * @memberOf module:for-react.diagrams
 */
export class GraphParameterFormBuilder {
  /** Builds the form state for a node instance against its manifest. */
  buildForm(
    node: GraphNodeInstance,
    manifest: GraphNodeManifest
  ): GraphParameterFormState {
    const values = GraphParameterFormBuilder.parameterValuesOf(node);
    const fields: GraphParameterField[] = [];
    const renderedParameters: GraphParameterDefinition[] = [];
    const issues: Record<string, GraphParameterValueIssue[]> = {};
    const dynamicOptionsParameters: string[] = [];
    const disabled = node.disabled === true;

    for (const parameter of manifest.parameters) {
      const value = GraphParameterFormBuilder.intrinsicValueOf(parameter, values[parameter.id]);
      values[parameter.id] = value;
      const visible = graphParameterVisibilityOf(parameter.visibility, values);
      fields.push({ parameter, value, visible, disabled });
      if (!visible || parameter.type === 'hidden') {
        // Hidden values are preserved verbatim unless explicitly directed otherwise (§4.6/§4.12).
        continue;
      }

      renderedParameters.push(parameter);
      if (
        parameter.type === 'options' &&
        (parameter as { loadOptionsMethod?: string }).loadOptionsMethod
      ) {
        dynamicOptionsParameters.push(parameter.id);
      }
      issues[parameter.id] = graphParameterValidationIssuesOf(parameter, value);
    }

    return { fields, renderedParameters, values, issues, dynamicOptionsParameters };
  }

  private static parameterValuesOf(node: GraphNodeInstance): Record<string, GraphJsonValue | undefined> {
    return { ...(node.parameters ?? {}) };
  }

  private static intrinsicValueOf(
    parameter: GraphParameterDefinition,
    value: GraphJsonValue | undefined
  ): GraphJsonValue | undefined {
    if (value !== undefined) return value;
    if (parameter.defaultValue === undefined) return undefined;
    return parameter.defaultValue;
  }
}

import type { ComponentType } from 'react';
import type { GraphParameterDefinition } from '@decaf-ts/as-graph/shared';
import type { GraphParameterRendererContract } from './GraphParameterRendererContract.js';
import { GraphGenericParameterComponent } from './components/graph-generic-parameter.component.js';
import { GraphTextParameterComponent } from './components/graph-text-parameter.component.js';
import { GraphNumberParameterComponent } from './components/graph-number-parameter.component.js';
import { GraphBooleanParameterComponent } from './components/graph-boolean-parameter.component.js';
import { GraphOptionsParameterComponent } from './components/graph-options-parameter.component.js';
import { GraphCollectionParameterComponent } from './components/graph-collection-parameter.component.js';
import { GraphObjectParameterComponent } from './components/graph-object-parameter.component.js';
import { GraphCodeParameterComponent } from './components/graph-code-parameter.component.js';
import { GraphExpressionParameterComponent } from './components/graph-expression-parameter.component.js';
import { GraphResourceLocatorParameterComponent } from './components/graph-resource-locator-parameter.component.js';
import { GraphCredentialParameterComponent } from './components/graph-credential-parameter.component.js';
import { GraphNoticeParameterComponent } from './components/graph-notice-parameter.component.js';
import { GraphHiddenParameterComponent } from './components/graph-hidden-parameter.component.js';

/**
 * @description Resolves the {@link GraphParameterRendererContract} implementation class used to render one manifest parameter. Custom frontend components are explicitly registered at build time; unregistered parameter types fall back to generic rendering so arbitrary JavaScript is never downloaded from backend-installed nodes and custom UI cannot override backend validation.
 * @summary Resolves the {@link GraphParameterRendererContract} implementation class used to render one manifest parameter.
 * @memberOf module:for-react.diagrams
 */
export class GraphParameterRendererRegistry {
  private readonly renderers = new Map<string, ComponentType<GraphParameterRendererContract>>();

  register(
    type: GraphParameterDefinition['type'],
    component: ComponentType<GraphParameterRendererContract>
  ): this {
    this.renderers.set(type, component);
    return this;
  }

  resolve(parameter: GraphParameterDefinition): ComponentType<GraphParameterRendererContract> {
    return this.renderers.get(parameter.type) ?? GraphGenericParameterComponent;
  }

  has(type: string): boolean {
    return this.renderers.has(type);
  }
}

/**
 * @description Registers every built-in {@link GraphParameterRendererContract} implementation documented in the manifest parameter type union into {@link registry}, keyed by the parameter definition type. Must be invoked once before a registry entry is resolved; unregistered types keep resolving to {@link GraphGenericParameterComponent}.
 * @summary Registers every built-in {@link GraphParameterRendererContract} implementation documented in the manifest parameter type union into {@link registry}, keyed by the parameter definition type.
 * @example ```ts
 * graphRegisterParameterRenderers(registry);
 * registry.resolve(parameter); // → GraphTextParameterComponent for type 'string'
 * ```
 * @memberOf module:for-react.diagrams
 */
export function graphRegisterParameterRenderers(
  registry: GraphParameterRendererRegistry
): GraphParameterRendererRegistry {
  return registry
    .register('string', GraphTextParameterComponent)
    .register('number', GraphNumberParameterComponent)
    .register('boolean', GraphBooleanParameterComponent)
    .register('options', GraphOptionsParameterComponent)
    .register('collection', GraphCollectionParameterComponent)
    .register('object', GraphObjectParameterComponent)
    .register('code', GraphCodeParameterComponent)
    .register('expression', GraphExpressionParameterComponent)
    .register('resourceLocator', GraphResourceLocatorParameterComponent)
    .register('credential', GraphCredentialParameterComponent)
    .register('notice', GraphNoticeParameterComponent)
    .register('hidden', GraphHiddenParameterComponent);
}

/** @module for-react/diagrams/catalog/GraphNodeCatalogCompositeSource
 * @summary Catalog source that keeps frontend fixtures first and merges backend extras.
 * @description The demo's decorated node kinds are not published to the backend, and
 * even the kinds the backend does publish can carry different port/parameter
 * shapes than the demo's locally compiled manifests — so fixtures stay
 * authoritative for every kind they know, the live backend list supplies extra
 * kinds when it responds, and the fixture set stands alone when the backend is
 * down. Invocations of node methods stay backend-only.
 */
import { signal } from '../internal/reactive.js';
import type { GraphJsonValue, GraphNodeInstance, GraphNodeManifest, GraphResolvedNodeManifest } from '@decaf-ts/as-graph/shared';
import { GraphNodeCatalogApi, graphNodeCatalogFailureOf } from './GraphNodeCatalogApi.js';
import type { GraphNodeCatalogFailure, GraphNodeCatalogSource } from './GraphNodeCatalogStore.js';
import { GraphNodeCatalogFixtureSource } from './GraphNodeManifestFixtures.js';

/**
 * @description Catalog source merging fixture manifests (authoritative) with live backend extras; fixtures stand alone when the backend is down.
 * @summary Catalog source merging fixture manifests (authoritative) with live backend extras; fixtures stand alone when the backend is down.
 * @memberOf module:for-react.diagrams
 */
export class GraphNodeCatalogCompositeSource implements GraphNodeCatalogSource {
  constructor(
    private readonly live: GraphNodeCatalogApi | undefined = undefined,
    private readonly fixed: GraphNodeCatalogFixtureSource = new GraphNodeCatalogFixtureSource()
  ) {}
  /**
   * Failure class of the last degraded live fetch (G3-27): `null` while the
   * live source is healthy (or absent), otherwise the classified failure the
   * palette renders alongside the fixture fallback.
   */
  private readonly failureSignal = signal<GraphNodeCatalogFailure | null>(null);

  /**
   * Fixture manifests first (they keep the demo's own decorated kinds
   * authoritative), live backend extras merged in, fixture set alone when the
   * backend is unreachable or answers out of contract. A degraded live fetch is
   * recorded on {@link failure} instead of being swallowed (G3-27).
   */
  async fetchManifests(): Promise<GraphNodeManifest[]> {
    const fixed = await this.fixed.fetchManifests();
    if (!this.live) {
      this.failureSignal.set(null);
      return fixed;
    }
    try {
      const live = await this.live.fetchManifests();
      this.failureSignal.set(null);
      // The backend catalogue is authoritative: it lists exactly the kinds the
      // selected engine runs, with their current ports. The bundled snapshot
      // is an offline fallback only — preferring it showed stale port ids and
      // offered kinds the engine cannot execute.
      if (live.length > 0) return live;
      return fixed;
    } catch (error) {
      // backend down (or out of contract) → fixtures only, but never silently
      this.failureSignal.set(graphNodeCatalogFailureOf(error));
      return fixed;
    }
  }

  /**
   * Last degraded live fetch's failure class, or `null` while the live source is
   * healthy or absent (G3-27).
   */
  failure(): GraphNodeCatalogFailure | null {
    return this.failureSignal();
  }

  /**
   * Fixture manifests first (they keep the demo's own decorated kinds
   * authoritative), live backend extras merged in, fixture set alone when the
   * backend is unreachable.
   */ async fetchManifest(kind: string): Promise<GraphNodeManifest | undefined> {
    if (this.live) {
      try {
        const served = await this.live.fetchManifest(kind);
        if (served) return served;
      } catch (error) {
        // backend down (or out of contract) → fixtures only, but never silently
        this.failureSignal.set(graphNodeCatalogFailureOf(error));
      }
    }
    return this.fixed.fetchManifest(kind);
  }

  async resolveManifest(
    kind: string,
    instance: Pick<GraphNodeInstance, 'parameters' | 'metadata'>
  ): Promise<GraphResolvedNodeManifest> {
    if (this.live) {
      try {
        return await this.live.resolveManifest(kind, instance);
      } catch (error) {
        this.failureSignal.set(graphNodeCatalogFailureOf(error));
      }
    }
    return this.fixed.resolveManifest(kind, instance);
  }

  async invokeMethod(kind: string, method: string, request: Record<string, GraphJsonValue>): Promise<GraphJsonValue> {
    if (this.live) {
      return this.live.invokeMethod(kind, method, request);
    }
    return this.fixed.invokeMethod();
  }
}

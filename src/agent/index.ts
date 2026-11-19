/**
 * @namespace agent
 * @description Named `./agent` subpath export of `@decaf-ts/for-react`.
 * @summary Agent conversation UI over a graph workflow run, ported from
 * `@decaf-ts/for-angular/agent` onto the `@ai-sdk/react` message-envelope
 * layer. The subpath ships the transport contract and the default graph-run
 * transport (HTTP create + SSE replay), the legacy bridge, the deterministic
 * demo transport, the envelope fold with its `UIMessageChunk` producer, the
 * transcript renderer, the media-URL allowlist, the decaf composer/message
 * models, the React provider and `useAgentChat` composition, and the chat
 * component families. Importing this subpath is the only way to load
 * `@ai-sdk/react`, `ai` or `zustand`; hosts that stay on the root entrypoint
 * never download or evaluate them. The public surface is re-exported from
 * `public-api.ts`.
 * @memberOf module:for-react
 */
export * from "./public-api.js";

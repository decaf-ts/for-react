/**
 * @module module:for-react.math
 * @description Public API for the `@decaf-ts/for-react/math` secondary entry
 * point.
 * @summary Re-exports the MathLive-backed `<MathInput>` form control and its
 * `MathInputComponent` / `RgxMathInput` naming aliases. `mathlive` is an
 * optional peer dependency resolved lazily at runtime, so no MathLive type is
 * exported or re-exported through this surface.
 * @memberOf module:for-react
 */
export {
  MathInput,
  MathInputComponent,
  RgxMathInput,
} from "./components/math-input/MathInput.js";
export type { MathInputProps } from "./components/math-input/MathInput.js";

# `@decaf-ts/for-react/barcode`

Barcode helpers backed by `@bwip-js/browser`, exposed as the `./barcode`
subpath export of `@decaf-ts/for-react`. The entry point has no Angular code and
no Decaf model dependency: it renders GS1 DataMatrix, DataMatrix and QR payloads
to SVG markup, plus a thin `<Barcode>` React component.

## Install

```bash
npm install @decaf-ts/for-react @bwip-js/browser@^4.11.4
```

`@bwip-js/browser` is an **optional peer dependency** of
`@decaf-ts/for-react`. Install it only in applications that import `/barcode`;
the root entry point never loads it.

### Compatibility

| Package | Tested range |
| --- | --- |
| `@bwip-js/browser` | `^4.11.4` (optional peer) |
| `@decaf-ts/for-react` | `0.0.x` |
| `react` / `react-dom` | `>=18.0.0` |

**This subpath is ESM-only.** `@bwip-js/browser@4.11.4` publishes only
`types` and `import` export conditions — it has no `require` or `default`
condition — so the encoder cannot be loaded synchronously from CommonJS. The
`exports["./barcode"]` map therefore declares only the `import` condition and
has no `require` entry: `import('@decaf-ts/for-react/barcode')` (or a static
ESM `import`) works, while `require('@decaf-ts/for-react/barcode')` throws
`ERR_PACKAGE_PATH_NOT_EXPORTED`. CJS hosts (Node SSR, Jest projects that do not
transform `node_modules`, webpack `require` resolution) must use a dynamic
`import()` instead; the public API stays synchronous once the module is loaded.
The package root and the other subpaths are unaffected and still ship both ESM
and CJS entries.

`@bwip-js/browser` is MIT-licensed; see the package `LICENSE`.

## Usage

```tsx
import {
  Barcode,
  BarcodeTypes,
  renderBarcodeSvg,
  type BarcodeRenderOptions,
} from '@decaf-ts/for-react/barcode';

const options: BarcodeRenderOptions = {
  bcid: BarcodeTypes.gs1datamatrix,
  options: { scale: 4, height: 16 },
};

// Component: the validator gate is applied internally on every render.
<Barcode text="(01)09501101530003(17)261231" {...options} />

// Markup: validated SVG string for a custom sink.
const svg = renderBarcodeSvg('(01)09501101530003(17)261231', options);
```

For a ready-made detached element (browser only, DOM-API parity with the
Angular entry point):

```ts
import { createBarcodeContainer } from '@decaf-ts/for-react/barcode';

const container = createBarcodeContainer('(01)09501101530003', {
  bcid: 'gs1datamatrix',
  width: '280px',
  height: '280px',
});
if (container) {
  target.replaceChildren(container);
}
```

### `<Barcode>` props

`<Barcode>` renders the validated SVG inside a single wrapper `<div>`; the
`className` and `style` props are applied to that wrapper, while the SVG is
injected through `dangerouslySetInnerHTML`. Presentation and accessibility
attributes therefore belong to the wrapper, not to the SVG element. When
encoding or validation fails, the component renders `null` and no wrapper is
emitted.

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `text` | `string` | — (required) | Payload to encode; at most 4096 characters. |
| `bcid` | `BarcodeType` | `datamatrix` | Symbology to render (`gs1datamatrix`, `datamatrix`, `qrcode`). |
| `options` | `Partial<BwippOptions>` | — | Rendering overrides merged onto `DEFAULT_BARCODE_OPTIONS` and validated key by key (see [Options](#options)). |
| `className` | `string` | — | Class name applied to the wrapper `<div>`. |
| `style` | `React.CSSProperties` | — | Inline styles applied to the wrapper `<div>`. |
| `ariaLabel` | `string` | `"Barcode"` | Accessible name (`aria-label`) of the wrapper element. |
| `role` | `string` | `"img"` | ARIA role of the wrapper element. |

## The React sink and the mandatory validator gate

The Angular entry point wrapped output in
`DomSanitizer.bypassSecurityTrustHtml` before binding it through `[innerHTML]`.
React has no sanitizer bypass: the equivalent sink is
`dangerouslySetInnerHTML`, which inserts the string **without escaping**.

Because that sink is unsanitized, the `validateBarcodeSvg` gate is mandatory on
every render path:

- `<Barcode>` always runs `renderBarcodeSvg` (which validates) and then gates
  the result through `validateBarcodeSvg` before it reaches
  `dangerouslySetInnerHTML`. If either step throws, the component renders
  nothing rather than injecting unvalidated markup.
- `renderBarcodeSvg` runs every result through `validateBarcodeSvg` before
  returning it, so a host that binds the string elsewhere still receives
  validated markup — but it must not bypass the validator for transformed or
  re-serialized output.
- `createBarcodeContainer` goes through `renderBarcodeSvg`, so its `innerHTML`
  is validated markup too.

Never bind raw `@bwip-js/browser` output to `dangerouslySetInnerHTML` (or
`innerHTML`) directly.

`validateBarcodeSvg(svg)` is DOM-parser based: the trimmed markup is parsed
with `DOMParser.parseFromString(markup, 'text/html')` — the same parsing path
the `innerHTML` / `dangerouslySetInnerHTML` sinks use — so validation inspects
the tree the browser will actually build. The parsed body must contain exactly
one root element, an `<svg>` in the SVG namespace
(`http://www.w3.org/2000/svg`), and the DOM walk then enforces:

- **Elements** are limited to what `@bwip-js/browser` emits: `svg`, `defs`,
  `clipPath`, `rect` and `path`. Every element must belong to the SVG
  namespace; anything else (including `<script>`) is rejected.
- **Attributes** are limited to `viewBox`, `xmlns`, `width`, `height`,
  `fill`, `d`, `fill-rule`, `stroke`, `stroke-width`, `stroke-linecap`,
  `stroke-linejoin`, `transform`, `clip-path`, `clip-rule`, `id` and
  `opacity`. Namespaced attributes such as `xmlns:xlink` and `xlink:href`
  are rejected, as are `on*` event handlers and `style`, `href` or `data-*`
  attributes; a supplied `xmlns` must declare the SVG namespace. Every other
  attribute value is checked for entity-decoded
  `javascript:`/`vbscript:`/`data:` scheme URIs.
- **Text and non-element nodes** are rejected: non-whitespace text nodes,
  comments, CDATA sections, processing instructions and document-type nodes
  all throw; whitespace-only text is tolerated.

On violation it throws a `ValidationError`; otherwise it returns the trimmed
markup. Validation fails closed: when no `DOMParser` is available in the
runtime, it throws instead of returning unvalidated markup.

## Options

`options` overrides are merged onto `DEFAULT_BARCODE_OPTIONS` and validated key
by key before rendering. A key outside the allowlist below — or a value that
does not match the expected shape — throws a `ValidationError`; keys set to
`undefined` are ignored.

| Category | Keys | Accepted values |
| --- | --- | --- |
| Numeric | `scale`, `scaleX`, `scaleY`, `height`, `width`, `padding`, `paddingwidth`, `paddingheight`, `paddingtop`, `paddingleft`, `paddingright`, `paddingbottom`, `textsize`, `textgaps`, `textxoffset`, `textyoffset`, `borderwidth`, `borderleft`, `borderright`, `bordertop`, `borderbottom`, `addontextxoffset`, `addontextyoffset`, `addontextsize`, `guardwidth`, `guardheight`, `guardleftpos`, `guardrightpos`, `guardleftypos`, `guardrightypos`, `inkspread`, `inkspreadh`, `inkspreadv`, `sizelimit` | Finite number, or a string matching `-?\d+(\.\d+)?` (coerced to a number), within its inclusive range (see below) |
| Boolean | `includeBarcodeText`, `includecheck`, `includecheckintext`, `includetext`, `parse`, `parsefnc`, `dotty`, `binarytext`, `showborder`, `guardwhitespace`, `monochrome` | `true` / `false` |
| Hex colour | `backgroundcolor`, `barcolor`, `textcolor`, `bordercolor` | 3, 6 or 8 hex digits with an optional leading `#` |
| Font | `textfont`, `addontextfont` | 1–64 characters of letters, digits, spaces and `_.,+-` |
| Enum | `textxalign`, `textyalign`, `rotate` | `textxalign`: `offleft`, `left`, `center`, `right`, `offright`, `justify` — `textyalign`: `below`, `center`, `above` — `rotate`: `N`, `R`, `L`, `I` |
| Bounded text | `alttext` | At most 1024 characters with no angle brackets |

Numeric options are range-bounded. A value outside its inclusive range —
whether supplied as a number or as a coerced numeric string — throws a
`ValidationError`:

| Inclusive range | Keys |
| --- | --- |
| `0.01`–`100` | `scale`, `scaleX`, `scaleY` |
| `1`–`10000` | `width`, `height` |
| `0`–`1000` | `padding`, `paddingwidth`, `paddingheight`, `paddingtop`, `paddingleft`, `paddingright`, `paddingbottom`, `textsize`, `addontextsize`, `borderwidth`, `borderleft`, `borderright`, `bordertop`, `borderbottom` |
| `-10000`–`10000` | every other numeric key: `textgaps`, `textxoffset`, `textyoffset`, `addontextxoffset`, `addontextyoffset`, `guardwidth`, `guardheight`, `guardleftpos`, `guardrightpos`, `guardleftypos`, `guardrightypos`, `inkspread`, `inkspreadh`, `inkspreadv`, `sizelimit` |

The arguments are validated as well: `text` must be a string of at most 4096
characters and `bcid` must be one of the `BarcodeTypes` keys (exact case);
anything else — or a numeric option outside its inclusive range — throws a
`ValidationError`.

## API

| Export | Purpose |
| --- | --- |
| `Barcode` | React component: encodes `text`, gates through `validateBarcodeSvg`, and renders through `dangerouslySetInnerHTML`; renders nothing when validation fails. |
| `BarcodeComponent` | Alias of `Barcode`. |
| `BarcodeTypes` | Supported symbologies: `gs1datamatrix`, `datamatrix`, `qrcode`. |
| `BarcodeType` | Union of the supported symbology names. |
| `DEFAULT_BARCODE_OPTIONS` | Baseline `@bwip-js/browser` options (scale, padding, text alignment, background). |
| `BarcodeRenderOptions` | `{ bcid?, options? }` accepted by both helpers; `options` overrides are validated against the allowlist (see [Options](#options)). |
| `renderBarcodeSvg(text, options?)` | Returns validated SVG markup for the payload. Defaults to `datamatrix`. |
| `validateBarcodeSvg(svg)` | Validates SVG markup against the output allowlist and returns the trimmed markup; throws `ValidationError` on any disallowed element, attribute, event handler or URI. |
| `createBarcodeContainer(text, options?)` | Returns a detached `HTMLElement` containing the SVG, or `undefined` when the payload cannot be encoded. |

### Behaviour

- These helpers do not validate GS1 application identifiers or check digits;
  they encode exactly the payload they are given. Validate business rules in
  the host.
- Invalid payloads throw from `renderBarcodeSvg`; invalid arguments, disallowed
  option keys, out-of-range option values, or a payload over 4096 characters
  throw a `ValidationError` before encoding starts (see [Options](#options)).
  `createBarcodeContainer` catches the error, logs it and returns `undefined`;
  `<Barcode>` catches the error and renders nothing.
- `renderBarcodeSvg` returns trusted SVG markup generated by
  `@bwip-js/browser` and validated against the output allowlist; it does not
  echo the raw payload as HTML.
- `createBarcodeContainer` accepts `width`/`height` values matching
  `/^\d{1,5}(px)?$/` (for example `280px` or `120`). Any other value throws a
  `ValidationError` before the container is built, so caller input never
  reaches the `style` attribute unchecked.
- No DOM is touched by `renderBarcodeSvg`. `createBarcodeContainer` and
  `<Barcode>` require a browser DOM and must only be rendered client-side.

## License

`@bwip-js/browser` is MIT-licensed. It is an external optional peer and is not
vendored.

<p align="center">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="./asset/logo-dark.svg" height="200px" alt="Logo">
        <source media="(prefers-color-scheme: light)" srcset="./asset/logo.svg" height="200px" alt="Logo">
        <img alt="Logo" src="./asset/logo.svg" height="200px">
    </picture>
</p>
<h2 align="center">
CSS toolkit for combining CSS properties
</h2>

---

ComboCSS scans your source files for class names and generates CSS from a compact class syntax. Utility classes can be grouped into reusable custom classes called combos.

ComboCSS is currently recommended with Vite/PostCSS setups.

## Installation

```bash
npm install -D combocss postcss
npx combo init
```

Add ComboCSS to your PostCSS config:

```js
import { plugin } from "combocss";

export default {
    plugins: [plugin()],
};
```

## Basic syntax

A generated class has at least two parts:

```txt
camelCaseProperty-value
```

Example:

```html
<div class="backgroundColor-blue display-inlineFlex"></div>
```

Generates:

```css
.backgroundColor-blue {
    background-color: blue;
}

.display-inlineFlex {
    display: inline-flex;
}
```

Values with spaces use dashes:

```html
<div class="border-1px-solid-black"></div>
```

CSS functions can be used directly. Replace spaces inside function values with underscores:

```html
<div class="backgroundColor-rgba(255,255,0,0.1) marginLeft-calc(100%_-_16px)"></div>
```

CSS variables are supported:

```html
<div class="backgroundColor-var(--color-primary)"></div>
```

## Combos

Combos group classes into a named class. Add custom CSS files in `combo.config.json` under `custom`.

```css
.button-base {
    @combo minWidth-200px borderRadius-8px;
}

.button-primary {
    @combo button-base backgroundColor-#ff1342;
}
```

```html
<button class="button-primary"></button>
```

Combos may reference other combos. Circular combo chains are reported as diagnostics.

## Shortcuts

Shortcuts map a short prefix to a CSS property:

```css
.ml {
    @shortcut marginLeft;
}
```

```html
<div class="ml-32px"></div>
```

Generates `margin-left: 32px`.

## Responsive prefixes

Configure breakpoints in `combo.config.json`:

```json
{
    "breakpoints": {
        "tablet": "600px",
        "pc": "1440px"
    }
}
```

Use them as prefixes:

```html
<div class="tablet:height-32px pc:display-flex"></div>
```

## Important and negative values

```html
<div class="!height-24px -marginTop-8px"></div>
```

Generates important and negative declarations.

## Pseudo selectors

Pseudo selectors can be appended after the main class:

```html
<div class="backgroundColor-red:hover"></div>
<div class="backgroundColor-red:has(.item:hover)"></div>
```

Complex selectors are parsed with parentheses awareness, but dynamic/generated class strings may still need to be added to the `classes` safelist.

## JIT mode

JIT mode is the recommended way to use ComboCSS in Vite/PostCSS projects. It scans the files configured in `combo.config.json`, generates only the classes it finds, writes them to the configured `output` CSS file, and watches for changes during development.

Add ComboCSS to your PostCSS config:

```js
import { plugin } from "combocss";

export default {
    plugins: [plugin()],
};
```

Import the generated output CSS file in your app entry:

```js
import "./src/index.css";
```

Example `combo.config.json` JIT setup:

```json
{
    "input": ["index.html", "src/**/*.{vue,js,ts,jsx,tsx}"],
    "output": "src/index.css",
    "custom": ["src/combo.custom.css"],
    "classes": [],
    "cache": ".combocss"
}
```

During development, ComboCSS watches:

- files matched by `input`
- files matched by `custom`
- `combo.config.json`

The generated cache is stored in `.combocss/store` by default. Add `.combocss` to `.gitignore`.

For classes built dynamically at runtime, add the final class names to the `classes` safelist:

```json
{
    "classes": ["display-flex", "backgroundColor-red:hover", "tablet:height-32px"]
}
```

You can also run the watcher directly from the CLI:

```bash
npx combo watch
```

## Standalone mode

```js
import { combocss } from "combocss";

const css = await combocss(["marginLeft-8px"]);
console.log(css);
```

Custom combos can be passed as raw CSS:

```js
const css = await combocss(["button-primary"], {
    custom: `
        .button-primary {
            @combo display-flex backgroundColor-red;
        }
    `,
});
```

## CLI

```bash
npx combo init
npx combo init --force
npx combo process
npx combo process --config combo.config.json
npx combo watch
npx combo validate
npx combo clean
```

## Config

Default `combo.config.json`:

```json
{
    "input": ["index.html", "src/**/*.{vue,js,ts,jsx,tsx}"],
    "output": "src/index.css",
    "custom": ["custom.css"],
    "classes": [],
    "cache": ".combocss",
    "strict": false,
    "plugins": [],
    "ignore": {
        "prefix": [],
        "suffix": [],
        "class": []
    },
    "breakpoints": {
        "tablet": "600px",
        "tabletAndPC": "1024px",
        "pc": "1440px",
        "ultrawide": "1921px"
    }
}
```

### Config fields

- `input`: source globs ComboCSS scans.
- `output`: generated CSS file.
- `custom`: custom combo/shortcut CSS globs.
- `classes`: safelisted classes to always generate.
- `cache`: project-local cache directory. Defaults to `.combocss`.
- `strict`: emits warnings for invalid classes that cannot create declarations.
- `plugins`: optional post-processing plugins. Defaults to `[]` so JIT mode never fails because of external PostCSS plugin parsing/configuration. Use `["autoprefixer"]` if you want generated CSS to be autoprefixed. Add `"stylelint"` only if your project has a Stylelint config.
- `ignore.prefix`: class prefixes to ignore.
- `ignore.suffix`: class suffixes to ignore.
- `ignore.class`: exact class names to ignore.
- `breakpoints`: responsive prefix map.

## Extraction limitations

ComboCSS extracts literal classes from HTML, Vue, JS, TS, JSX, and TSX. It supports static `class="..."`, simple Vue `:class` object/array string literals, JSX `className="..."`, and plain string literals that look like ComboCSS classes.

For highly dynamic class generation, add classes to `classes` in `combo.config.json`.

## Browser and shared core

The browser entry is intentionally thin and imports the same standalone implementation as Node:

```js
import { combocss } from "combocss/browser";
```

Use the build command to regenerate the browser entry from shared source when needed:

```bash
npm run build:browser
```

The core parser/generator exports are available for advanced integrations:

```js
import { createCSSClassesData, getClassParts } from "combocss/core";
```

## Development

Run tests:

```bash
npm test
```

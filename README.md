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

Generates:

```css
.border-1px-solid-black {
    border: 1px solid black;
}
```

CSS variables are supported as values:

```html
<div class="backgroundColor-var(--color-primary)"></div>
<div class="border-1px-solid-var(--cyan)"></div>
```

Generates:

```css
.backgroundColor-var\(--color-primary\) {
    background-color: var(--color-primary);
}

.border-1px-solid-var\(--cyan\) {
    border: 1px solid var(--cyan);
}
```

## Function values

CSS functions can be used directly. Replace spaces inside function arguments with underscores:

```html
<div class="width-calc(100%_-_16px)"></div>
```

Generates:

```css
.width-calc\(100\%_-_16px\) {
    width: calc(100% - 16px);
}
```

CamelCase function names are converted to CSS function names:

```html
<div class="maskImage-linearGradient(to_bottom,_black,_transparent_82%)"></div>
```

Generates:

```css
.maskImage-linearGradient\(to_bottom\,_black\,_transparent_82\%\) {
    mask-image: linear-gradient(to bottom, black, transparent 82%);
}
```

## Raw values for edge cases

Use braces when a value should be passed through as raw CSS:

```html
<div class="fontFamily-{Inter, system-ui, sans-serif}"></div>
```

Generates:

```css
.fontFamily-\{Inter\,_system-ui\,_sans-serif\} {
    font-family: Inter, system-ui, sans-serif;
}
```

Raw values are useful for complex values such as font stacks, slash-separated values, multiple backgrounds, and grid template strings:

```txt
font-{italic 700 1rem/1.5 Inter, system-ui}
background-{linear-gradient(...), radial-gradient(...)}
gridTemplateAreas-{"header header" "sidebar main"}
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

Custom selectors that should generate ComboCSS output must include `@combo` or `@shortcut`. Plain selectors without either directive are ignored by ComboCSS and should live in regular CSS files.

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
        "tablet": "700px",
        "desktop": "1024px",
        "wide": "1440px"
    }
}
```

Use them as prefixes:

```html
<div class="marginLeft-8px tablet:marginLeft-12px desktop:marginLeft-14px wide:marginLeft-16px"></div>
```

ComboCSS generates base classes first, then responsive classes from the smallest breakpoint to the largest breakpoint:

```css
.marginLeft-8px {
    margin-left: 8px;
}

@media (min-width: 700px) {
    .tablet\:marginLeft-12px {
        margin-left: 12px;
    }
}

@media (min-width: 1024px) {
    .desktop\:marginLeft-14px {
        margin-left: 14px;
    }
}

@media (min-width: 1440px) {
    .wide\:marginLeft-16px {
        margin-left: 16px;
    }
}
```

Breakpoint sorting supports `px`, `rem`, and `em`. `rem` and `em` are sorted as `value * 16`. Unknown units fall back to config order.

## Important and negative values

```html
<div class="!height-24px -marginTop-8px"></div>
```

Generates important and negative declarations:

```css
.!height-24px {
    height: 24px !important;
}

.-marginTop-8px {
    margin-top: -8px;
}
```

## Pseudo selectors

Utility pseudo selectors can be appended after the main class:

```html
<div class="marginLeft-8px:hover"></div>
<div class="backgroundColor-red:has(.item:hover)"></div>
```

If no matching custom selector exists, ComboCSS generates escaped utility pseudo classes:

```css
.marginLeft-8px\:hover:hover {
    margin-left: 8px;
}
```

Custom selectors win over utility pseudo generation. If `combo.custom.css` defines a selector like this:

```css
.app-shell {
    @combo position-relative;
}

.app-shell:before {
    @combo content-'' position-absolute;
}
```

using only the base class:

```html
<div class="app-shell"></div>
```

generates both selectors as real CSS selectors:

```css
.app-shell {
    position: relative;
}

.app-shell:before {
    content: '';
    position: absolute;
}
```

ComboCSS does not generate the broken escaped selector `.app-shell\:before:before`. Complex selectors are parsed with parentheses awareness, but dynamic/generated class strings may still need to be added to the `classes` safelist.

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
    "cache": ".combocss",
    "plugins": []
}
```

During development, ComboCSS watches:

- files matched by `input`
- files matched by `custom`
- `combo.config.json`

The generated cache is stored in `.combocss/store` by default. Add `.combocss` to `.gitignore`.

Post-processing plugins are opt-in. By default, `plugins` is `[]` so JIT mode does not crash because of external PostCSS plugin parsing/configuration. Use `plugins: ["autoprefixer"]` if you want generated CSS to be autoprefixed. Add `"stylelint"` only when your project has a Stylelint config.

If post-processing fails, ComboCSS writes the generated CSS without post-processing and logs a warning instead of crashing the watcher.

For classes built dynamically at runtime, add the final class names to the `classes` safelist:

```json
{
    "classes": ["display-flex", "backgroundColor-red:hover", "tablet:height-32px"]
}
```

Dynamic template literal classes are ignored by extractors because their final values are not statically knowable:

```vue
<template>
    <div :class="[`solar-shell-${body.orbit}`]"></div>
</template>
```

Safelist the possible final classes instead.

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

Standalone mode returns an empty string when there are no classes.

Optional diagnostics can be collected:

```js
const diagnostics = [];
const css = await combocss(["button-primary"], {
    custom: `.button-primary { @combo button-primary; }`,
    diagnostics,
});
```

## CLI

```bash
npx combo init
npx combo init --force
npx combo process
npx combo process --config combo.config.json
npx combo watch
npx combo watch --config combo.config.json
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
- `cache`: project-local cache directory. Defaults to `.combocss`; the internal store is `.combocss/store`.
- `strict`: emits warnings for invalid classes that cannot create declarations.
- `plugins`: optional post-processing plugins. Defaults to `[]` so JIT mode never fails because of external PostCSS plugin parsing/configuration. Use `["autoprefixer"]` if you want generated CSS to be autoprefixed. Add `"stylelint"` only if your project has a Stylelint config.
- `ignore.prefix`: class prefixes to ignore.
- `ignore.suffix`: class suffixes to ignore.
- `ignore.class`: exact class names to ignore.
- `breakpoints`: responsive prefix map. Generated output is sorted mobile-first from smallest to largest breakpoint.

## Extraction limitations

ComboCSS extracts literal classes from HTML, Vue, JS, TS, JSX, and TSX. It supports:

- static `class="..."`
- simple Vue `:class` / `v-bind:class` object and array string literals
- JSX `className="..."`
- plain JS/TS string literals that look like ComboCSS classes

Dynamic template literal classes containing `${...}` are ignored. For highly dynamic class generation, add classes to `classes` in `combo.config.json`.

## Browser and shared core

The browser entry is intentionally thin and imports the same standalone implementation as Node:

```js
import { combocss } from "combocss/browser";
```

The core parser/generator exports are available for advanced integrations:

```js
import { createCSSClassesData, getClassParts } from "combocss/core";
```

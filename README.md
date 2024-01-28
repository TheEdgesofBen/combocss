<p align="center">    
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="./asset/logo-dark.svg" height="200px" alt="Logo">
        <source media="(prefers-color-scheme: light)" srcset="./asset/logo.svg" height="200px" alt="Logo">
        <img alt="Logo" src="./asset/logo.svg" height="200px">
    </picture>
</p>
<h2 align="center">
CSS Toolkit for combining CSS properties
</h2>

---

### Currently it`s recommended to use ComboCSS only with Vite.

ComboCSS creates out of CSS classes property counterparts which can be combined into group classes called combos.

### Counterpart Example

The Toolkit scanes your code for CSS classes and generates property counterparts out of it for class not ignored or specified as combo class. CSS classes must be written in ComboCSS specific syntax.

```html
<div class="backgroundColor-blue"></div>
```

```CSS
.backgroundColor-blue {
    background-color: blue;
}
```

### Combo Example

Css classes can be combined into groups called combos which also can be used in other combos. To create combos you have to add at least one file path into the combo.config.json custom property.

```html
<div class="button-primary"></div>
```

A Combo class has to start with @combo as his first propery followed by CSS classes or other combos.

```CSS
.button-base {
    @combo minWidth-200px borderRadius-8px;
}

.button-primary {
    @combo button-base backgroundColor-#ff1342;
}
```

### Shortcut Example

A shortcut can be created for CSS classes and also be used in combos.

```html
<div class="ml-32px"></div>
```

```CSS
.ml {
    @shortcut marginLeft;
}

.button-primary {
    @combo button-base backgroundColor-#ff1342 ml-32px;
}
```

### Syntax

A Counterpart for a CSS class can only be created by ComboCSS when it matches the syntax.
Every ComboCSS valid class has at least 2 parts. CSS property in camelCase and CSS value in camelCase seperated by a dash.

#### kebab-kase to camalCase Example

```html
<div name="kabap-case" style="background-color: blue; display: inline-flex"></div>
<div name="camalCase" class="backgroundColor-blue display-inlineFlex"></div>
```

#### Value with spaces

Values with spaces have to be seperated dashes.

```html
<div name="kabap-case" style="border: 1px solid black"></div>
<div name="camalCase" class="border-1px-solid-black"></div>
```

#### Value functions

Values with function can also be created in ComboCSS only spaces like in calc() have to be replaces with underscores.

```html
<div name="kabap-case" style="backgroundColor: rgba(255,255,0,0.1); margin-left: calc(100% - 16px)"></div>
<div name="camalCase" class="backgroundColor-rgba(255,255,0,0.1) marginLeft-calc(100%_-_16px)"></div>
```

## Documentation

Coming 20XX

# Installation

## Step 1

Install ComboCSS postcss via npm.

    npm install -D combocss postcss

## Step 2

Initialize ComboCSS with npx to create combo.config.json.

    npx combo init

# How to use ComboCSS

## Modes

### Standalone Mode

You can use ComboCSS via import.<br>combocss(classes, opts) has two params and returns translated css as string.<br>Param one must be a Array of combo css classes<br>Param two is an optional config object [See Config](#config)

```js
import combocss from "combocss";

let res = await combocss(["marginLeft-8px"]);

/* 
    .marginLeft-8px {
        margin-left: 8px
    }
*/
console.log(res);
```

### JIT Mode

Add ComboCSS to your postcss.config.js or any other postcss configuration.

```js
import { plugin } from "combocss";

export default {
    plugins: [plugin()],
};
```

### CLI Mode

Via the command process you can use ComboCSS too.<br>Currently process uses the config file.<br>Meaning the command scans all files targeted via the input property and writes the finished css into the file declared in the output property.

    npx combo process

<a name="config"></a>

### Config

In combo.config.json you can upon other options change the scope of files combocss should scan for css classes with the property input. All generated ComboCSS classes will be written into the file specified in the property output. The default combo.config.json look like this.

```json
{
    "input": ["index.html", "src/**/*.{vue,js,ts,jsx,tsx}"],
    "output": "src/index.css",
    "custom": ["custom.css"],
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

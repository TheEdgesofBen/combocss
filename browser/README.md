<p align="center">    
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="../asset/logo-dark.svg" height="200px" alt="Logo">
        <source media="(prefers-color-scheme: light)" srcset="../asset/logo.svg" height="200px" alt="Logo">
        <img alt="Logo" src="./asset/logo.svg" height="200px">
    </picture>
</p>
<h2 align="center">
CSS Toolkit for combining CSS properties
</h2>

---

# ComboCSS for Browser

This is the browser Version of ComboCSS please read the main [documentation](https://github.com/TheEdgesofBen/combocss) for context.

# Installation

Install ComboCSS postcss via npm.

    npm install combocss-browser postcss

# How to use ComboCSS for Browser

You can use ComboCSS via import.<br>combocss(classes, opts) has two params and returns translated css as string.<br>Param one must be a Array of combo css classes<br>Param two is an optional config object [See Config](#config)

```js
import { combocss } from "combocss";

let res = await combocss(["marginLeft-8px"]);

/* 
    .marginLeft-8px {
        margin-left: 8px
    }
*/
console.log(res);
```

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

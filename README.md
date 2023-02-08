<p align="center">    
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="./asset/logo-dark.svg" height="200px" alt="Logo">
        <source media="(prefers-color-scheme: light)" srcset="./asset/logo.svg" height="200px" alt="Logo">
        <img alt="Logo" src="./asset/logo.svg" height="200px">
    </picture>
</p>
<h2 align="center">
CSS Toolkit for combining css properties
</h2>

---

### Currently it`s recommended to use ComboCSS only with Vite.<br>At this time ComboCSS is only available in a JIT mode.

## How to use ComboCSS

ComboCSS creates out of css classes property counterparts which can be combined into group classes.

### Counterpart Example

The Toolkit scanes your code for css classes generate property counterparts out of it.

    <div class="backgroundColor-blue"></div>

    .backgroundColor-blue {
        background-color-blue
    }

## Documentation

Coming 20XX

# Installation

## Step 1

Install ComboCSS postcss via npm.

    npm install -D combocss postcss

## Step 2

Initialize ComboCSS with npx to create combo.config.json.

    npx combo init

## Step 3

Add ComboCSS to your postcss.config.js or any other postcss configuration.

    module.exports = {
        plugins: {
            combocss: {},
        }
    }

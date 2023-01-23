<img src="./asset/logo.svg" height="200px" alt="Logo" style="display: block; margin-left: auto; margin-right: auto">
<h2 align="center">
CSS Toolkit for combining css properties
</h2>

---

### Currently it`s recommended to use ComboCSS only with Vite.<br>At this time ComboCSS is only available in a JIT mode.

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

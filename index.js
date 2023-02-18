/*
TODOS:

- Custom classes of custom classes [CHECK]
- Support for special css values like hex color or functions like url() [CHECK]
- Custom prop shortcuts [CHECK]
- Seperated file and syntax for custom classes and more [CHECK]
- Support for minus values [CHECK]
- Watcher for jit (chokidar) [CHECK]
- Map for css classes in use with count of usage [CHECK]
- Seperated file for config & init method [CHECK]
- Name (Combo) [Check]
- Fix bug class combos without "-" [Check]
- Shortcuts with multiply "-" [Check]
- Shottcuts inherit for prefixes like "!" & "-" [Check]
- Important prefix "!" in classes [Check]
- Improve gathering classes from files &llow value function with "," and spaces [Check]
- Possibility to add classes manuely in config [Check]
- Ignore dashes in value functions [Check]
- Fix update output file (Class map + count) [Check]
- Reload config by changes [Check]
- Loop combo error handling [Check]
- Ignore suffix not working [Check]

- Fix shortcuts with multiple dashes like bgc-(--var) or roundness-0-0-24px-24px
- Fix shortcuts with negativ values like -mt-8px
- Fix pseudo-element not working like intented
- Class order rethinking
- Important not working
- Breackpoint min-width instead max-width
- Comments & Refactoring
- Error handling for syntax errors from css outfile file 
- Relead framework page in dev mode by combo changes

- Custom values names??? 
- Complex custom class builder with params???

*/

const comboProcess = require("./lib/process");
const chokidar = require("chokidar");
const fs = require("fs");

let initialized = false;
let config = JSON.parse(fs.readFileSync("combo.config.json"));

/**
 * @type {import('postcss').PluginCreator}
 */

function init(opts) {
    if (!config) config = opts;

    initialized = true;

    console.log("ComboCSS Init", new Date());

    comboProcess(config);

    if (process.env.NODE_ENV === "production") return;

    const watcher = chokidar.watch(config.input);

    watcher.on("change", () => {
        console.log("ComboCSS change detected", new Date());

        config = JSON.parse(fs.readFileSync("combo.config.json"));

        if (!config) config = opts;

        comboProcess(config);
    });
}

module.exports = (opts = {}) => {
    if (!initialized) init(opts);

    return {
        postcssPlugin: "combocss",
    };
};

module.exports.postcss = true;

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

- Comments & Refactoring
- Error handling for syntax errors from css outfile file 

- Custom values names??? 
- Complex custom class builder with params???

*/

const process = require("./lib/process");
const chokidar = require("chokidar");
const fs = require("fs");

let initialized = false;
let config = JSON.parse(fs.readFileSync("combo.config.json"));

/**
 * @type {import('postcss').PluginCreator}
 */

function init(opts) {
    if (!config) config = opts;

    const watcher = chokidar.watch(config.input);

    initialized = true;

    console.log("Init", new Date());

    process(config);

    watcher.on("change", () => {
        console.log("Change", new Date());
        process(config);
    });
}

module.exports = (opts = {}) => {
    console.log("Plugin Call", new Date());

    if (!initialized) init(opts);

    return {
        postcssPlugin: "project-combo",
    };
};

module.exports.postcss = true;

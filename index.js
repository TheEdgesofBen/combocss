/*
TODOS:

Released
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
- Breackpoint min-width instead max-width [CHECK]
- Fix shortcuts with multiple dashes like bgc-(--var) [CHECK]
- Fix shortcuts with negativ values like -mt-8px [CHECK]
- Class order rethinking [CHECK]
- Fix escaping from classes in MediaQuery classes [CHECK]
- Fix pseudo classes on shortcut and classes with value functions [CHECK]
- Diasable camelToDash for css vars [CHECK]
- General tests & escaping tests [CHECK]
- Fix shortcuts with multiple dash values like roundness-0-0-24px-24px [CHECK]
- Important not working [CHECK]
- MediaQuery always after normal classes [CHECK]

Done

Pending
- Fix pseudo-element not working like intented [Investing]
- Fix Escaping in selectors like :has [Investing]

Next
- Comments & Refactoring
- Error handling combo uses unknown combo class
- Error handling for syntax errors from css outfile file

NiceToHave
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

import { identifyClasses, createCSSClassesData } from "./process.js";
import { isResponsive, getCustomMap } from "./utils.js";
import { stringCSSToPostCSS, postCSSToStringCSS, appendClassNodesToRoot, enrichCSSWithPlugins } from "./postcss.js";

// Process raw file classes by identifying custom combo classes and returning created CSS.
async function processCombo(rawFileClasses, opts = {}) {
    let diagnostics = [];
    let customMap = getCustomMap(opts.custom || "");
    let identifiedFileClasses = identifyClasses(rawFileClasses, customMap, opts.breakpoints);
    let classesData = createCSSClassesData(identifiedFileClasses, customMap, opts.breakpoints, {
        diagnostics,
        strict: opts.strict,
    });
    let css = await createComboCSSClasses(classesData, opts.breakpoints, opts.plugins || []);

    if (opts.diagnostics) opts.diagnostics.push(...diagnostics);

    return css;
}

// Creates css combo classes first non-responsive and then responsive classes.
async function createComboCSSClasses(classesData, breakpoints = {}, plugins = []) {
    let root = null;
    let classes = {
        nonResponsive: {},
        responsive: {},
    };

    if (Object.keys(classesData || {}).length == 0) return "";

    root = stringCSSToPostCSS("");

    Object.keys(classesData).forEach((selector) => {
        if (isResponsive(selector, breakpoints)) classes.responsive[selector] = classesData[selector];
        else classes.nonResponsive[selector] = classesData[selector];
    });

    Object.keys(classes).forEach((type) => {
        root = appendClassNodesToRoot(classes[type], root, type, breakpoints);
    });

    let result = postCSSToStringCSS(root);
    let enrichedCSS = await enrichCSSWithPlugins(result.css, plugins);

    return enrichedCSS || result.css;
}

export { createComboCSSClasses };
export default processCombo;

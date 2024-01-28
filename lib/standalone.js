const { identifyClasses, createCSSClassesData } = require("./process");
const { isResponsive, getCustomMap } = require("./utils");
const { stringCSSToPostCSS, postCSSToStringCSS, appendClassNodesToRoot, enrichCSSWithPlugins } = require("./postcss");

// Process raw file classess by identiy custom combo classes and return created css combo classes
async function processCombo(rawFileClasses, opts = {}) {
    let identifiedFileClasses = {};
    let classesData = {};

    let customMap = getCustomMap(opts.custom || "");

    identifiedFileClasses = identifyClasses(rawFileClasses, customMap, opts.breakpoints);

    classesData = createCSSClassesData(identifiedFileClasses, customMap, opts.breakpoints);

    return await createComboCSSClasses(classesData, opts.breakpoints);
}

// Creates css combo classes first non-responsive and than responsive classes
async function createComboCSSClasses(classesData, breakpoints = {}) {
    let root = null;
    let classes = {
        nonResponsive: {},
        responsive: {},
    };

    if (Object.keys(classesData || {}).length == 1) return console.log("ComboCSS no classes");

    root = stringCSSToPostCSS("");

    /*
    if (root.nodes[0]?.type != "atrule" && root.nodes[0]?.name != "layer") {
        root = addLayerNodeAtRoot(root, layersOrder);
    }
    */

    Object.keys(classesData).forEach((selector) => {
        if (isResponsive(selector, breakpoints)) {
            classes.responsive[selector] = classesData[selector];
        } else classes.nonResponsive[selector] = classesData[selector];
    });

    Object.keys(classes).forEach((type) => {
        root = appendClassNodesToRoot(classes[type], root, type, breakpoints);
    });

    let result = postCSSToStringCSS(root);

    //console.log("End", currentFileClasses, result.css);

    let enrichedCSS = await enrichCSSWithPlugins(result.css);

    if (enrichedCSS) {
        return enrichedCSS;
    } else console.log("Error creating combo");
}

module.exports = processCombo;

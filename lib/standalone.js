const postcss = require("postcss");
const autoprefixer = require("autoprefixer");
const { identifyClasses, createCSSClassesData } = require("./process");
const { isResponsive, getCustomMap } = require("./utils");
const { stringCSSToPostCSS, postCSSToStringCSS, appendClassNodesToRoot } = require("./postcss");

async function process(rawFileClasses, opts = {}) {
    let identifiedFileClasses = {};
    let classesData = {};

    let customMap = getCustomMap(opts.custom || "");

    identifiedFileClasses = identifyClasses(rawFileClasses, customMap, opts.breakpoints);

    classesData = createCSSClassesData(identifiedFileClasses, customMap, opts.breakpoints);

    return await createComboCSSClasses(classesData, opts.breakpoints);
}

async function createComboCSSClasses(classesData, breakpoints = {}) {
    let root = null;
    let classes = {
        nonResponsive: {},
        responsive: {},
    };

    if (Object.keys(classesData || {}).length == 0) return console.log("No Changes");

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

    return await new Promise((resolve, reject) => {
        postcss([autoprefixer])
            .process(result)
            .then((autoprefixerResult) => {
                autoprefixerResult.warnings().forEach((warn) => {
                    //console.warn(warn.toString());
                });

                resolve(autoprefixerResult.css);
            });
    });
}

module.exports = process;

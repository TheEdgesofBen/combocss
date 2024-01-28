const fs = require("fs");
const fg = require("fast-glob");
const postcss = require("postcss");
const autoprefixer = require("autoprefixer");
const chokidar = require("chokidar");
const { identifyClasses, createCSSClassesData } = require("./process");
const { extractRawFilesClasses } = require("./extractors");
const { isResponsive, currentFileClasses, getCustomMapByGlob, getLayersOrder } = require("./utils");
const { stringCSSToPostCSS, postCSSToStringCSS, addLayerNodeAtRoot, appendClassNodesToRoot, removeNodeBySelectorInRoot } = require("./postcss");

let initialized = false;
let config = JSON.parse(fs.readFileSync("combo.config.json"));
let classesMap = {};
let layersMap = {};

/**
 * @type {import('postcss').PluginCreator}
 */

function init(opts, mode = "plugin") {
    if (!config) config = opts;

    initialized = true;

    if (mode == "plugin") {
        console.log("ComboCSS Init", new Date());
    }

    process(config, "init");

    if (mode == "plugin") {
        if (process.env?.NODE_ENV === "production") return;

        const watcher = chokidar.watch(config.input);

        watcher.on("change", () => {
            console.log("ComboCSS change detected", new Date());

            config = JSON.parse(fs.readFileSync("combo.config.json"));

            if (!config) config = opts;

            process(config);
        });
    }
}

function getMapsFromStore(opts, customMap) {
    let base64filesPaths = fg.sync("./store/*");
    let classesMap = {};
    let layersMap = {};

    base64filesPaths.forEach((base64filesPath) => {
        let filePath = base64filesPath.split("./store/")[1].split(".")[0];

        filePath = Buffer.from(filePath, "base64").toString("utf-8");

        let fileData = fs.readFileSync(base64filesPath, "utf8");

        let cssClassesData = createCSSClassesData(JSON.parse(fileData), customMap, opts.breakpoints);

        Object.keys(cssClassesData).forEach((selector) => {
            if (!classesMap[selector]) classesMap[selector] = [];

            if (!classesMap[selector].includes(filePath)) classesMap[selector].push(filePath);

            if (cssClassesData[selector].layer) {
                layer = cssClassesData[selector].layer.replace(/[^\w-:]/g, "\\$&");

                layersMap[selector] = layer;
            }
        });
    });

    return { classesMap, layersMap };
}

function saveFileClassesInStore(classes, filePath) {
    let base64FilePath = Buffer.from(filePath).toString("base64");

    fs.writeFileSync(`./store/${base64FilePath}.json`, JSON.stringify(classes));
}

function process(opts, mode) {
    let rawFilesClasses = {};
    let identifiedFilesClasses = {};
    let newOutputData = {};

    let customMap = getCustomMapByGlob(opts.custom);
    let layersOrder = getLayersOrder(opts.custom);

    if (mode == "init") {
        let { classesMap: initClassesMap, layersMap: initLayersMap } = getMapsFromStore(opts, customMap);

        classesMap = initClassesMap;
        layersMap = initLayersMap;
    }

    rawFilesClasses = extractRawFilesClasses(opts);

    Object.keys(rawFilesClasses).forEach((filePath) => {
        identifiedFilesClasses[filePath] = identifyClasses(Array.from(rawFilesClasses[filePath]), customMap, opts.breakpoints);
        saveFileClassesInStore(identifiedFilesClasses[filePath], filePath);
    });

    Object.keys(identifiedFilesClasses).forEach((filePath) => {
        newOutputData[filePath] = createCSSClassesData(identifiedFilesClasses[filePath], customMap, opts.breakpoints);
    });

    createComboCSSClassesOutputFile(newOutputData, opts.output, opts.breakpoints, layersOrder);
}

function createComboCSSClassesOutputFile(newOutputData, outputFilePath, breakpoints = {}, layersOrder = {}) {
    let outFileData = null;
    let root = null;
    let classes = {
        nonResponsive: {},
        responsive: {},
    };

    if (Object.keys(newOutputData || {}).length == 0) return console.log("No Changes");

    if (fs.existsSync(outputFilePath)) {
        outFileData = fs.readFileSync(outputFilePath);
    } else outFileData = "";

    root = stringCSSToPostCSS(outFileData);

    if (root.nodes[0]?.type != "atrule" && root.nodes[0]?.name != "layer") {
        root = addLayerNodeAtRoot(root, layersOrder);
    }

    Object.keys(newOutputData).forEach((filePath) => {
        let fileClasses = newOutputData[filePath];

        Object.keys(fileClasses).forEach((selector) => {
            if (isResponsive(selector, breakpoints)) {
                classes.responsive[selector] = fileClasses[selector];
            } else classes.nonResponsive[selector] = fileClasses[selector];

            if (!classesMap[selector]) classesMap[selector] = [];

            if (!classesMap[selector].includes(filePath)) classesMap[selector].push(filePath);
        });
    });

    Object.keys(classes).forEach((type) => {
        let { root: updatedRoot, layersMap: updatedLayersMap } = appendClassNodesToRoot(classes[type], root, type, breakpoints, layersMap);

        layersMap = updatedLayersMap;
        root = updatedRoot;
    });

    Object.keys(classesMap).forEach((selector) => {
        classesMap[selector].forEach((filePath, fileNameIndex) => {
            if (newOutputData[filePath] && !newOutputData[filePath][selector]) {
                classesMap[selector].splice(fileNameIndex, 1);
            }
        });
    });

    Object.keys(classesMap).forEach((selector) => {
        if (classesMap[selector].length == 0) {
            root = removeNodeBySelectorInRoot(selector, root, layersMap, breakpoints);

            delete classesMap[selector];

            delete layersMap[selector];
        }
    });

    let result = postCSSToStringCSS(root);

    //console.log("End", currentFileClasses, result.css);
    postcss([autoprefixer])
        .process(result)
        .then((autoprefixerResult) => {
            autoprefixerResult.warnings().forEach((warn) => {
                console.warn(warn.toString());
            });
            console.log(autoprefixerResult.css);

            fs.writeFileSync("./" + outputFilePath, autoprefixerResult.css);
        });
}

module.exports = (opts = {}, mode) => {
    if (!initialized) init(opts, mode);

    return {
        postcssPlugin: "combocss",
    };
};

module.exports.postcss = true;

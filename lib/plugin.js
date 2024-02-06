import path from "path";
import chokidar from "chokidar";
import { identifyClasses, createCSSClassesData } from "./process.js";
import { extractRawFilesClasses } from "./extractors/index.js";
import { isResponsive, currentFileClasses, getCustomMapByGlob, getLayersOrder } from "./utils.js";
import {
    stringCSSToPostCSS,
    postCSSToStringCSS,
    addLayerNodeAtRoot,
    appendClassNodesToRoot,
    removeNodeBySelectorInRoot,
    enrichCSSWithPlugins,
} from "./postcss.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

let fs = null;
let fg = null;

if (typeof window !== "object") {
    let { fs: _fs, fg: _fg } = await import("./nodeOnly.js");

    fs = _fs;
    fg = _fg;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let initialized = false;
let config = JSON.parse(fs.readFileSync("combo.config.json"));
let classesMap = {};
let layersMap = {};

/**
 * @type {import('postcss').PluginCreator}
 */

// Inits by starting process and watcher for file changes to update the outfile dynamically like a jit mode if the mode is plugin.
async function init(opts, mode = "plugin") {
    if (!config) config = opts;

    initialized = true;

    if (!fs.existsSync(path.resolve(__dirname, "../store"))) {
        fs.mkdirSync(path.resolve(__dirname, "../store"));
    }

    if (mode == "plugin") {
        console.log("ComboCSS Init", new Date());
    }

    await processCombo(config, "init");

    if (mode == "plugin") {
        if (process.env?.NODE_ENV === "production") return;

        const watcher = chokidar.watch(config.input);

        watcher.on("change", async () => {
            console.log("ComboCSS change detected", new Date());

            config = JSON.parse(fs.readFileSync("combo.config.json"));

            if (!config) config = opts;

            await processCombo(config);
        });
    }
}

// Process raw files classess by identiy custom combo classes and writing created css combo classes to the output file
async function processCombo(opts, mode) {
    let rawFilesClasses = {};
    let identifiedFilesClasses = {};
    let newOutputData = {};

    let customMap = getCustomMapByGlob(opts.custom);
    let layersOrder = getLayersOrder(opts.custom);

    console.log("ComboCSS scanning");

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

    await createComboCSSClassesOutputFile(newOutputData, opts.output, opts.breakpoints, layersOrder);
}

/*
Creates css combo classes first non-responsive and than responsive classes. 
Afterwards writes new classes and removes unused classes in the output file.
*/
async function createComboCSSClassesOutputFile(newOutputData, outputFilePath, breakpoints = {}, layersOrder = {}) {
    let outFileData = null;
    let root = null;
    let classes = {
        nonResponsive: {},
        responsive: {},
    };

    if (Object.keys(newOutputData || {}).length == 1) return console.log("ComboCSS no changes");

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

    let enrichedCSS = await enrichCSSWithPlugins(result.css);

    if (enrichedCSS) {
        fs.writeFileSync("./" + outputFilePath, enrichedCSS);

        console.log("ComboCSS output file updated");
    } else console.log("Error creating combo output file");
}

// Gets maps from store which saves the current state of the outfile
function getMapsFromStore(opts, customMap) {
    let base64filesPaths = fg.sync("./store/*", { cwd: path.resolve(__dirname, "../") });
    let classesMap = {};
    let layersMap = {};

    base64filesPaths.forEach((base64filesPath) => {
        let filePath = base64filesPath.split("./store/")[1].split(".")[0];

        filePath = Buffer.from(filePath, "base64").toString("utf-8");

        let fileData = fs.readFileSync(path.resolve(__dirname, "." + base64filesPath), "utf8");

        let cssClassesData = createCSSClassesData(JSON.parse(fileData), customMap, opts.breakpoints);

        Object.keys(cssClassesData).forEach((selector) => {
            if (!classesMap[selector]) classesMap[selector] = [];

            if (!classesMap[selector].includes(filePath)) classesMap[selector].push(filePath);

            if (cssClassesData[selector].layer) {
                let layer = cssClassesData[selector].layer.replace(/[^\w-:]/g, "\\$&");

                layersMap[selector] = layer;
            }
        });
    });

    return { classesMap, layersMap };
}

// Saves classes from one file to the store by encoding the file path to base64 as fileName
function saveFileClassesInStore(classes, filePath) {
    let base64FilePath = Buffer.from(filePath).toString("base64");

    fs.writeFileSync(path.resolve(__dirname, `../store/${base64FilePath}.json`), JSON.stringify(classes));
}

export default (opts = {}, mode) => {
    if (!initialized) init(opts, mode);

    return {
        postcssPlugin: "combocss",
    };
};

let exportObj = {
    postcss: true,
};

export { exportObj };

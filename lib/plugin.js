import path from "path";
import { identifyClasses, createCSSClassesData } from "./process.js";
import { init as extractorInit, extractRawFilesClasses } from "./extractors/index.js";
import { init as utilsInit, isResponsive, getCustomMapByGlob, getLayersOrder } from "./utils.js";
import { loadConfig } from "./config.js";
import {
    init as postcssInit,
    stringCSSToPostCSS,
    postCSSToStringCSS,
    addLayerNodeAtRoot,
    appendClassNodesToRoot,
    removeNodeBySelectorInRoot,
    enrichCSSWithPlugins,
} from "./postcss.js";
import { getModules } from "./nodeOnly.js";

let fs, fg, chokidar;

let initialized = false;
let config = null;
let classesMap = {};
let layersMap = {};
let watcher = null;

async function initNodeModules() {
    if (typeof window === "object") return;

    let { fs: _fs, fg: _fg, chokidar: _chokidar } = await getModules("fs", "fg", "chokidar");

    fs = _fs;
    fg = _fg;
    chokidar = _chokidar;

    await extractorInit();
    await postcssInit();
    await utilsInit();
}

function ensureStore(config) {
    if (!fs.existsSync(config.cache)) fs.mkdirSync(config.cache, { recursive: true });
    if (!fs.existsSync(config.store)) fs.mkdirSync(config.store, { recursive: true });
}

function getWatchTargets(config) {
    return [...config.input, ...config.custom, config.configPath || "combo.config.json"].filter(Boolean);
}

// Inits by starting process and watcher for file changes to update the outfile dynamically like a jit mode if the mode is plugin.
async function init(opts = {}, mode = "plugin") {
    await initNodeModules();

    config = loadConfig(opts);
    initialized = true;
    ensureStore(config);

    if (mode == "plugin") console.log("ComboCSS Init", new Date());

    await processCombo(config, "init");

    if (mode == "plugin") {
        if (process.env?.NODE_ENV === "production") return;

        watcher = chokidar.watch(getWatchTargets(config), {
            useFsEvents: false,
            ignored: [config.output, `${config.cache}/**`],
        });

        let timeout = null;
        const queueProcess = () => {
            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                console.log("ComboCSS change detected", new Date());
                config = loadConfig(opts);
                ensureStore(config);
                await processCombo(config);
            }, 50);
        };

        watcher.on("change", queueProcess);
        watcher.on("add", queueProcess);
        watcher.on("unlink", queueProcess);
    }
}

// Process raw files classes by identifying custom combo classes and writing created css combo classes to the output file
async function processCombo(opts, mode) {
    let rawFilesClasses = {};
    let identifiedFilesClasses = {};
    let newOutputData = {};
    let diagnostics = [];

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
        saveFileClassesInStore(identifiedFilesClasses[filePath], filePath, opts);
    });

    Object.keys(identifiedFilesClasses).forEach((filePath) => {
        newOutputData[filePath] = createCSSClassesData(identifiedFilesClasses[filePath], customMap, opts.breakpoints, {
            diagnostics,
            strict: opts.strict,
        });
    });

    diagnostics.forEach((diagnostic) => {
        const log = diagnostic.severity === "error" ? console.error : console.warn;
        log(`ComboCSS ${diagnostic.severity}: ${diagnostic.message}`);
    });

    await createComboCSSClassesOutputFile(newOutputData, opts.output, opts.breakpoints, layersOrder);
}

/*
Creates css combo classes first non-responsive and then responsive classes.
Afterwards writes new classes and removes unused classes in the output file.
*/
async function createComboCSSClassesOutputFile(newOutputData, outputFilePath, breakpoints = {}, layersOrder = {}) {
    let outFileData = null;
    let root = null;
    let classes = {
        nonResponsive: {},
        responsive: {},
    };

    if (Object.keys(newOutputData || {}).length == 0) return console.log("ComboCSS no changes");

    if (fs.existsSync(outputFilePath)) outFileData = fs.readFileSync(outputFilePath);
    else outFileData = "";

    root = stringCSSToPostCSS(outFileData);

    if (root.nodes[0]?.type != "atrule" && root.nodes[0]?.name != "layer") {
        root = addLayerNodeAtRoot(root, layersOrder);
    }

    Object.keys(newOutputData).forEach((filePath) => {
        let fileClasses = newOutputData[filePath];

        Object.keys(fileClasses).forEach((selector) => {
            if (isResponsive(selector, breakpoints)) classes.responsive[selector] = fileClasses[selector];
            else classes.nonResponsive[selector] = fileClasses[selector];

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
    let css = result.css;
    let enrichedCSS = await enrichCSSWithPlugins(css, config?.plugins);

    if (!enrichedCSS) {
        console.warn("ComboCSS writing generated CSS without post-processing because post-processing failed");
        enrichedCSS = css;
    }

    fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
    fs.writeFileSync(outputFilePath, enrichedCSS);
    console.log("ComboCSS output file updated");
}

// Gets maps from store which saves the current state of the outfile
function getMapsFromStore(opts, customMap) {
    let base64filesPaths = fg.sync("*", { cwd: opts.store, absolute: false });
    let classesMap = {};
    let layersMap = {};

    base64filesPaths.forEach((base64filesPath) => {
        let filePath = base64filesPath.replace(/\.json$/, "");

        filePath = Buffer.from(filePath, "base64").toString("utf-8");

        let fileData = fs.readFileSync(path.resolve(opts.store, base64filesPath), "utf8");

        let cssClassesData = createCSSClassesData(JSON.parse(fileData), customMap, opts.breakpoints, { strict: opts.strict });

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
function saveFileClassesInStore(classes, filePath, opts) {
    let base64FilePath = Buffer.from(filePath).toString("base64");

    fs.writeFileSync(path.resolve(opts.store, `${base64FilePath}.json`), JSON.stringify(classes));
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

export { exportObj, init, processCombo };

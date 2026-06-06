import path from "path";
import { isIgnored } from "../utils.js";
import { extractHTMLClasses } from "./html.js";
import { extractVueClasses } from "./vue.js";
import { extractJSClasses } from "./js.js";
import { getModules } from "../nodeOnly.js";

let fs, fg;

let filesLastModified = {};

async function init() {
    if (typeof window !== "object") {
        let { fs: _fs, fg: _fg } = await getModules("fs", "fg");

        fs = _fs;
        fg = _fg;
    }
}

// Extracts all raw files classes not ignored targeted via glob inside the options object
function extractRawFilesClasses(opts) {
    let rawFilesClasses = {};
    let { filesContent, filesPaths } = getFilesContent(opts.input, opts.store);

    filesContent.forEach((fileContent, fileContentIndex) => {
        let filePath = filesPaths[fileContentIndex];
        let fileExtension = filesPaths[fileContentIndex].split(".").pop();

        rawFilesClasses[filePath] = extractRawFileClasses(fileContent, fileExtension, opts.ignore);
    });

    if (opts.classes) {
        let configClassesPath = opts.configPath || "combo.config.json";
        rawFilesClasses[configClassesPath] = new Set();

        opts.classes.forEach((currentClass) => {
            if (!isIgnored(currentClass, opts.ignore)) {
                rawFilesClasses[configClassesPath].add(currentClass);
            }
        });
    }

    return rawFilesClasses;
}

// Extracts all raw file classes not ignored from data via file extension
function extractRawFileClasses(data, fileExtension, ignore) {
    let rawFilesClasses = new Set();
    let classes = new Set();

    if (fileExtension == "vue") classes = extractVueClasses(data, classes);
    else if (fileExtension == "html") classes = extractHTMLClasses(data, classes);
    else if (["js", "ts", "jsx", "tsx"].includes(fileExtension)) classes = extractJSClasses(data, classes);

    classes.forEach((currentClass) => {
        if (!ignore || !isIgnored(currentClass, ignore)) rawFilesClasses.add(currentClass);
    });

    return rawFilesClasses;
}

// Gets files content from glob if the files are modified
function getFilesContent(unsolvedFilesPaths, storePath) {
    let filesContent = [];
    let filesPaths = fg.sync(unsolvedFilesPaths);
    let filesPathsChanged = [];

    filesPaths.forEach((filePath) => {
        let base64FilePath = Buffer.from(filePath).toString("base64");
        let storeModified = 0;
        let modified = fs.statSync(filePath).mtimeMs;
        let storeFilePath = path.resolve(storePath, `${base64FilePath}.json`);

        if (fs.existsSync(storeFilePath)) storeModified = fs.statSync(storeFilePath).mtimeMs;

        if (modified > storeModified && (!filesLastModified[filePath] || modified > filesLastModified[filePath])) {
            filesLastModified[filePath] = modified;
            let content = fs.readFileSync(filePath, "utf8");
            filesContent.push(content);
            filesPathsChanged.push(filePath);
        }
    });

    filesPaths = filesPathsChanged;

    return { filesContent, filesPaths };
}

export { init, extractRawFilesClasses, extractRawFileClasses };

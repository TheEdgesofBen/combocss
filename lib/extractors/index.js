const fg = require("fast-glob");
const fs = require("fs");
const { isIgnored } = require("../utils");
const { extractHTMLClasses } = require("./html");
const { extractVueClasses } = require("./vue");

let filesLastModified = {};

function extractRawFilesClasses(opts) {
    let rawFilesClasses = {};
    let { filesContent, filesPaths } = getFilesContent(opts.input, true);

    filesContent.forEach((fileContent, fileContentIndex) => {
        let filePath = filesPaths[fileContentIndex];
        let fileExtension = filesPaths[fileContentIndex].split(".").pop();

        rawFilesClasses[filePath] = extractRawFileClasses(fileContent, fileExtension, opts.ignore);
    });

    if (opts.classes) {
        rawFilesClasses["combo.config.json"] = new Set();

        opts.classes.forEach((currentClass) => {
            if (!isIgnored(currentClass, opts.ignore)) {
                rawFilesClasses["combo.config.json"].add(currentClass);
            }
        });
    }

    return rawFilesClasses;
}

function extractRawFileClasses(fileContent, fileExtension, ignore) {
    let rawFilesClasses = new Set();
    let classes = new Set();

    if (fileExtension == "vue") {
        classes = extractVueClasses(fileContent, classes);
    } else if (fileExtension == "html") {
        classes = extractHTMLClasses(fileContent, classes);
    }

    classes.forEach((currentClass) => {
        if (!ignore || !isIgnored(currentClass, ignore)) {
            rawFilesClasses.add(currentClass);
        }
    });

    return rawFilesClasses;
}

function getFilesContent(unsolvedFilesPaths) {
    let filesContent = [];
    let filesPaths = fg.sync(unsolvedFilesPaths);
    let filesPathsChanged = [];

    filesPaths.forEach((filePath) => {
        let base64FilePath = Buffer.from(filePath).toString("base64");
        let storeModified = 0;
        let modified = fs.statSync(filePath).mtimeMs;

        if (fs.existsSync(`./store/${base64FilePath}.json`)) {
            storeModified = fs.statSync(`./store/${base64FilePath}.json`).mtimeMs;
        }

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

module.exports = {
    extractRawFilesClasses: extractRawFilesClasses,
};

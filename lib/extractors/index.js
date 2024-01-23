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
        let classes = new Set();
        let filePath = filesPaths[fileContentIndex];

        if (filePath.includes(".vue")) {
            classes = extractVueClasses(fileContent, classes);
        } else if (filePath.includes(".html")) {
            classes = extractHTMLClasses(fileContent, classes);
        }

        rawFilesClasses[filePath] = new Set();

        classes.forEach((currentClass) => {
            if (!isIgnored(currentClass, opts)) {
                rawFilesClasses[filePath].add(currentClass);
            }
        });
    });

    if (opts.classes) {
        rawFilesClasses["combo.config.json"] = new Set();

        opts.classes.forEach((currentClass) => {
            if (!isIgnored(currentClass, opts)) {
                rawFilesClasses["combo.config.json"].add(currentClass);
            }
        });
    }

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

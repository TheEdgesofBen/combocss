const fs = require("fs");
const fg = require("fast-glob");
const { parse } = require("postcss");

const currentFileClasses = new Set();

function isResponsive(selector, breakpoints) {
    let isResponsiveSelector = Object.keys(breakpoints).find((breakpoint) => {
        return selector.replace(String.fromCharCode(92), "").indexOf(breakpoint) == 0;
    });

    if (isResponsiveSelector) return true;

    return false;
}

function getResponsiveName(selector, breakpoints) {
    let responsiveName = Object.keys(breakpoints).find((breakpoint) => {
        return selector.replace(String.fromCharCode(92), "").indexOf(breakpoint) == 0;
    });

    return responsiveName;
}

function getResponsiveSize(size, breakpoints) {
    return breakpoints[size];
}

function isIgnored(className, ignore) {
    let ignoredPrefix = ignore.prefix.find((prefix) => {
        return className.indexOf(prefix) == 0;
    });

    if (ignoredPrefix) return true;

    let ignoredSuffix = ignore.suffix.find((suffix) => {
        return className.indexOf(suffix) > -1 && className.indexOf(suffix) == className.length - suffix.length;
    });

    if (ignoredSuffix) return true;

    let ignoredClass = ignore.class.find((ignoredClassName) => {
        return className == ignoredClassName;
    });

    if (ignoredClass) return true;

    return false;
}

function camelToDash(str) {
    if (str != str.toLowerCase()) {
        str = str.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
    }
    return str;
}

function escapeCssSelector(selector, breakpoints) {
    let selectorParts = selector.split(":");
    let replaceRegex = /[^\w\-]/g;

    selector = selector.replace(replaceRegex, "\\$&");

    if (selectorParts.length > 1) {
        selector = "";

        selectorParts.forEach((selectorPart, selectorPartIndex) => {
            if (Object.keys(breakpoints || {}).includes(selectorPart)) {
                selector += selectorPart + ":";
            } else {
                if (Object.keys(breakpoints || {}).includes(selectorParts[0])) {
                    selector += selectorPart.replace(replaceRegex, "\\$&");
                } else if (selectorPartIndex + 1 < selectorParts.length) selector += selectorPart.replace(replaceRegex, "\\$&");
                else selector += selectorPart;

                if (selectorPartIndex + 1 < selectorParts.length) {
                    selector += String.fromCharCode(92) + ":" + selectorParts[selectorPartIndex + 1].replace(replaceRegex, "\\$&") + ":";
                }
            }
        });
    }

    return selector;
}

function splitStringByCSSVar(str) {
    const regex = /(\bvar\(-[a-zA-Z]+\))/g;
    return str.split(regex);
}

function checkSpecialStartChars(className) {
    let isNegativeValue = false;
    let isImportantValue = false;

    if (className.indexOf("-") == 0 || (className.indexOf("!") == 0 && className.indexOf("-") == 1)) isNegativeValue = true;
    if (className.indexOf("!") == 0) isImportantValue = true;

    return { isNegativeValue, isImportantValue };
}

function getLayersOrder(custumsGlob) {
    let layersOrder = [];
    let filesPaths = fg.sync(custumsGlob || []);

    filesPaths.forEach((filePath) => {
        layersOrder.push(filePath);
    });

    return layersOrder;
}

function getCustomMapByGlob(custumsGlob) {
    let customMap = {};
    let filesPaths = fg.sync(custumsGlob || []);
    let filesContent = [];

    filesPaths.forEach((filePath, filePathIndex) => {
        filesContent[filePathIndex] = fs.readFileSync(filePath, "utf8");
    });

    filesContent.forEach((fileContent, fileContentIndex) => {
        let filePath = filesPaths[fileContentIndex];

        Object.assign(customMap, getCustomMap(fileContent, filePath));
    });

    return customMap;
}

function getCustomMap(data, layer) {
    let customMap = {};
    let root = parse(data);

    root.nodes.forEach((rule) => {
        let customClassName = "";
        let customClassMap = {
            combo: "",
            shortcut: "",
            props: [],
            //order: fileContentIndex,
            layer: null,
        };

        if (rule.type == "rule") {
            customClassName = rule.selector;

            rule.nodes.forEach((node) => {
                if (node.type == "atrule" && node.name && node.params) {
                    customClassMap[node.name] = node.params;
                } else if (node.type == "decl" && (customClassMap.combo || customClassMap.shortcut)) {
                    customClassMap.props.push({ prop: node.prop, value: node.value });
                }
            });

            if (customClassName && (customClassMap.combo || customClassMap.shortcut)) {
                customMap[customClassName.slice(1)] = customClassMap;
            }

            if (layer && customClassMap.combo) {
                customClassMap.layer = layer;
            }
        }
    });

    return customMap;
}

module.exports = {
    isResponsive: isResponsive,
    getResponsiveSize: getResponsiveSize,
    getResponsiveName: getResponsiveName,
    isIgnored: isIgnored,
    camelToDash: camelToDash,
    escapeCssSelector: escapeCssSelector,
    splitStringByCSSVar: splitStringByCSSVar,
    checkSpecialStartChars: checkSpecialStartChars,
    getLayersOrder: getLayersOrder,
    getCustomMapByGlob: getCustomMapByGlob,
    getCustomMap: getCustomMap,
};

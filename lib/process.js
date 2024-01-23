const fg = require("fast-glob");
const fs = require("fs");
const { extractRawFilesClasses } = require("./extractors");
const { isResponsive, camelToDash, escapeCssSelector, currentFileClasses, splitStringByCSSVar, checkSpecialStartChars } = require("./utils");
const { stringCSSToPostCSS, postCSSToStringCSS, addLayerNodeAtRoot, appendClassNodesToRoot } = require("./postcss");

let classesMap = {};
let layersMap = {};

function process(opts, mode) {
    let rawFilesClasses = {};
    let identifiedFilesClasses = {};
    let newOutputData = {};

    let { layersOrder, customMap } = getCustomMap(opts);

    if (mode == "pluginInit") {
        let { classesMap: initClassesMap, layersMap: initLayersMap } = getMapsFromStore(opts, customMap);

        classesMap = initClassesMap;
        layersMap = initLayersMap;
    }

    rawFilesClasses = extractRawFilesClasses(opts);

    Object.keys(rawFilesClasses).forEach((filePath) => {
        identifiedFilesClasses[filePath] = identifyCustomClasses(Array.from(rawFilesClasses[filePath]), opts, customMap);
        saveFileClassesInStore(identifiedFilesClasses[filePath], filePath);
    });

    Object.keys(identifiedFilesClasses).forEach((filePath) => {
        newOutputData[filePath] = createCSSClassesData(identifiedFilesClasses[filePath], opts, customMap);
    });

    updateOutputFile(newOutputData, opts, layersOrder);
}

function updateOutputFile(newOutputData, opts, layersOrder) {
    let outFileData = null;
    let root = null;
    let classes = {
        nonResponsive: {},
        responsive: {},
    };

    if (Object.keys(newOutputData || {}).length == 0) return console.log("No Changes");

    if (fs.existsSync(opts.output)) {
        outFileData = fs.readFileSync(opts.output);
    } else outFileData = "";

    root = stringCSSToPostCSS(outFileData);

    if (root.nodes[0]?.type != "atrule" && root.nodes[0]?.name != "layer") {
        root = addLayerNodeAtRoot(root, layersOrder);
    }

    Object.keys(newOutputData).forEach((filePath) => {
        let fileClasses = newOutputData[filePath];

        Object.keys(fileClasses).forEach((selector) => {
            if (isResponsive(selector, opts)) {
                classes.responsive[selector] = fileClasses[selector];
            } else classes.nonResponsive[selector] = fileClasses[selector];

            if (!classesMap[selector]) classesMap[selector] = [];

            if (!classesMap[selector].includes(filePath)) classesMap[selector].push(filePath);
        });
    });

    Object.keys(classes).forEach((type) => {
        let { root: updatedRoot, layersMap: updatedLayersMap } = appendClassNodesToRoot(classes[type], root, layersMap, type, opts);

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
            root = removeNodeBySelectorInRoot(selector, root, layersMap, opts);

            delete classesMap[selector];

            delete layersMap[selector];
        }
    });

    let result = postCSSToStringCSS(root);

    //console.log("End", currentFileClasses, result.css);

    fs.writeFileSync("./" + opts.output, result.css);
}

function getCustomMap(opts) {
    let customMap = {};
    let filesPaths = fg.sync(opts.custom || []);
    let filesContent = [];
    let layersOrder = [];

    filesPaths.forEach((filePath, filePathIndex) => {
        filesContent[filePathIndex] = fs.readFileSync(filePath, "utf8");
        layersOrder.push(filePath);
    });

    filesContent.forEach((fileContent, fileContentIndex) => {
        let filePath = filesPaths[fileContentIndex];
        let root = stringCSSToPostCSS(fileContent);

        root.nodes.forEach((rule) => {
            let customClassName = "";
            let customClassMap = {
                combo: "",
                shortcut: "",
                props: [],
                order: fileContentIndex,
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

                if (customClassMap.combo) {
                    customClassMap.layer = filePath;
                }
            }
        });
    });

    return { layersOrder, customMap };
}

function getMapsFromStore(opts, customMap) {
    let base64filesPaths = fg.sync("./store/*");
    let classesMap = {};
    let layersMap = {};

    base64filesPaths.forEach((base64filesPath) => {
        let filePath = base64filesPath.split("./store/")[1].split(".")[0];

        filePath = Buffer.from(filePath, "base64").toString("utf-8");

        let fileData = fs.readFileSync(base64filesPath, "utf8");

        let cssClassesData = createCSSClassesData(JSON.parse(fileData), opts, customMap);

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

function getComboClassPart(primaryClassPart) {
    const startingSpecialChars = getStartingSpecialChars(primaryClassPart);
    let comboClassPart = primaryClassPart;

    if (startingSpecialChars) comboClassPart = comboClassPart.replace(startingSpecialChars, "");

    return comboClassPart;
}

function getShortcutClassPart(primaryClassPart, customMap = null) {
    const startingSpecialChars = getStartingSpecialChars(primaryClassPart);
    let shortcutClassPart = primaryClassPart;
    let shortcutClassEquivalent = null;
    let classParts = primaryClassPart.split(/\-(?![^\(]*\))/g);

    if (startingSpecialChars) {
        shortcutClassPart = shortcutClassPart.replace(startingSpecialChars, "");

        if (startingSpecialChars.includes("-") && startingSpecialChars.length == 1) {
            classParts.splice(0, 1);
        }
    }

    if (classParts.length > 1) {
        if (!customMap) {
            classParts.splice(classParts.length - 1, 1);
            shortcutClassPart = classParts.join("-");
        } else {
            /*
            classParts.splice(classParts.length - 1, 1);
            shortcutClassPart = classParts.join("-");
            
            */

            classParts.splice(classParts.length - 1, 1);

            shortcutClassPart = null;

            Object.keys(customMap).forEach((customClassKey) => {
                let customClass = customMap[customClassKey];

                if (!shortcutClassPart && customClass.shortcut) {
                    for (let i = 0; i < classParts.length; i++) {
                        if (!shortcutClassPart) {
                            let classPartsCompare = classParts.slice(0, classParts.length - i);

                            if (classPartsCompare.join("-") == customClassKey) {
                                shortcutClassEquivalent = classPartsCompare.join("-");
                                shortcutClassPart = classPartsCompare.join("-");
                            }
                        }
                    }
                }
            });

            if (!shortcutClassPart) shortcutClassPart = classParts.join("-");
        }
    } else if (classParts.length == 1) {
        shortcutClassPart = classParts[0];
    }

    return { shortcutClassPart, shortcutClassEquivalent };
}

function identifyCustomClasses(classes, opts, customMap) {
    let identifiedClass = {};
    let identifiedClasses = [];

    classes.forEach((cssClass) => {
        let className = getClassParts(cssClass, opts)[1];
        let { isNegativeValue, isImportantValue } = checkSpecialStartChars(className);

        if (isNegativeValue) {
            className = className.slice(1);
        }

        if (isImportantValue) {
            className = className.slice(1);
        }

        let foundCustom = Object.keys(customMap).find((customClass) => {
            return className == customClass;
        });

        if (!foundCustom) {
            foundCustom = Object.keys(customMap).find((customClass) => {
                let { shortcutClassPart } = getShortcutClassPart(className, customMap);
                return shortcutClassPart == customClass;
            });
        }

        identifiedClass = { cssClass: cssClass, custom: false };

        if (foundCustom) {
            identifiedClass.custom = true;
            identifiedClass.layer = customMap[foundCustom].layer;
        }

        identifiedClasses.push(identifiedClass);
    });

    return identifiedClasses;
}

function getClassProp(rawClassProp, opts) {
    let classProp = camelToDash(rawClassProp);

    return classProp;
}

function getClassParts(cssClass, opts) {
    let classRawParts = [];
    let classParts = [[], "", []];
    let mainPartFound = false;
    let responsiveSizes = [];

    if (opts.breakpoints) {
        responsiveSizes = Object.keys(opts.breakpoints || {}).map((breakpoint) => breakpoint);
    }

    classRawParts = cssClass.split(":");

    classRawParts.forEach((classPart) => {
        if ((!mainPartFound && responsiveSizes.length == 0) || !responsiveSizes.includes(classPart)) {
            mainPartFound = true;
            if (!classParts[1]) classParts[1] = classPart;
            else classParts[1] += ":" + classPart;
        } else if (!mainPartFound) {
            classParts[0].push(classPart);
        } else if (mainPartFound) {
            classParts[2].push(classPart);
        }
    });

    return classParts;
}

function getDeclarationParts(className) {
    let declarationParts = [];

    let { isNegativeValue, isImportantValue } = checkSpecialStartChars(className);

    declarationParts = className.split(":")[0].split(/\-(?![^\(]*\))/g);

    if (declarationParts[1] && declarationParts[1].match(/(\(.*?\))/)) {
        let valueFunc = declarationParts[1].split("(");
        valueFunc = "(" + valueFunc.splice(1, valueFunc.length).join("(");
        let resolvedValueFunc = valueFunc.replaceAll("_", " ");
        declarationParts[1] = declarationParts[1].replace(valueFunc, resolvedValueFunc);
    }

    if (isNegativeValue && declarationParts[1]) {
        declarationParts[0] = declarationParts[0] + declarationParts[1];

        declarationParts.splice(1, 1);

        declarationParts[1] = "-" + declarationParts[1];
    }

    if (isImportantValue && declarationParts[1]) {
        declarationParts[0] = declarationParts[0].slice(1);
        declarationParts[1] = declarationParts[1] + " !important";
    }

    return declarationParts;
}

function getStartingSpecialChars(primaryClassName) {
    const match = primaryClassName.match(/^[-!]+/);
    return match ? match[0] : "";
}

function inheritFromCustom(className, primaryCustomClassPart, isShortcut = false, shortcutClassEquivalent) {
    const startingSpecialChars = getStartingSpecialChars(className);
    const customStartingSpecialChars = getStartingSpecialChars(primaryCustomClassPart);
    let isImportantValue = false;
    let isNegativeValue = false;

    if (customStartingSpecialChars) {
        if (startingSpecialChars) {
            if (customStartingSpecialChars.indexOf("-") > -1 && startingSpecialChars.indexOf("-") == -1) {
                className = "-" + className;
            } else if (customStartingSpecialChars.indexOf("-") > -1 && startingSpecialChars.indexOf("-") > -1) {
                isNegativeValue = true;
            }

            if (customStartingSpecialChars.indexOf("!") == 0 && startingSpecialChars.indexOf("!") == -1) {
                className = "!" + className;
            } else if (customStartingSpecialChars.indexOf("!") == 0 && startingSpecialChars.indexOf("!") == 0) {
                isImportantValue = true;
            }
        } else {
            className = customStartingSpecialChars + className;

            if (customStartingSpecialChars.indexOf("-") > -1) {
                isNegativeValue = true;
            }

            if (customStartingSpecialChars.indexOf("!") == 0) {
                isImportantValue = true;
            }
        }
    }

    if (isShortcut) {
        if (isNegativeValue) {
            primaryCustomClassPart = primaryCustomClassPart.replace("-", "");
        }

        if (isImportantValue) {
            primaryCustomClassPart = primaryCustomClassPart.replace("!", "");
        }

        className = className + primaryCustomClassPart.replace(shortcutClassEquivalent, "");
    }

    return className;
}

function createClassRules(cssClass, opts, customMap) {
    let rules = [];
    let selectors = null;

    let classParts = getClassParts(cssClass, opts);
    let className = classParts[1];
    let { isNegativeValue, isImportantValue } = checkSpecialStartChars(className);

    if (isNegativeValue) {
        className = className.slice(1);
    }

    if (isImportantValue) {
        className = className.slice(1);
    }
    let comboClassPart = getComboClassPart(className);
    let { shortcutClassPart, shortcutClassEquivalent } = getShortcutClassPart(className, customMap);
    let declarationParts = [];
    let classProp = null;

    if (customMap[comboClassPart] && customMap[comboClassPart].combo) {
        selectors = customMap[comboClassPart].combo.split(" ").map((selector) => {
            return inheritFromCustom(selector, classParts[1], false);
        });
    } else if (customMap[shortcutClassPart] && customMap[shortcutClassPart].shortcut) {
        selectors = customMap[shortcutClassPart].shortcut.split(" ").map((selector) => {
            return inheritFromCustom(selector, classParts[1], true, shortcutClassEquivalent);
        });
    } else selectors = [classParts[1]];

    if (customMap[comboClassPart] && selectors.includes(comboClassPart)) {
        console.error("Error combo class includes it self: ", comboClassPart);

        return rules;
    }

    selectors.forEach((selector) => {
        classParts = getClassParts(selector, opts);
        comboClassPart = getComboClassPart(classParts[1]);

        let { shortcutClassPart } = getShortcutClassPart(classParts[1], customMap);

        if (customMap[comboClassPart]?.combo || customMap[shortcutClassPart]?.shortcut) {
            let nextRules = createClassRules(selector, opts, customMap);

            nextRules.forEach((nextRule) => {
                let rulePropTaken = rules.find((rule) => nextRule.prop == rule.prop);

                rules.push(nextRule);
            });
        } else {
            if (cssClass.includes(":")) {
                declarationParts = getDeclarationParts(classParts[1]);
            } else declarationParts = getDeclarationParts(selector);

            classProp = getClassProp(declarationParts[0], opts);

            declarationParts.splice(0, 1);

            declarationParts = declarationParts.map((declarationPart) => {
                let cssVarSplits = splitStringByCSSVar(declarationPart);

                cssVarSplits = cssVarSplits.map((split) => {
                    if (split?.match(/(\(.*?\))/)) {
                        return split;
                    }

                    return camelToDash(split);
                });

                return cssVarSplits.join("");
            });

            if (cssClass && declarationParts.join("")) {
                let nextRule = { prop: classProp, value: declarationParts.join(" ") };
                let rulePropTaken = rules.find((rule) => nextRule.prop == rule.prop);

                rules.push(nextRule);
            }
        }
    });

    if (customMap[getClassParts(cssClass, opts)[1]]) {
        customMap[getClassParts(cssClass, opts)[1]].props.forEach((nextRule) => {
            rules.push(nextRule);
        });
    }

    return rules;
}

function createCSSClassesData(identifiedClasses, opts, customMap) {
    let cssClasses = {};

    identifiedClasses.forEach((identifiedClass, identifiedClassIndex) => {
        let classParts = [];
        let classProp = null;
        let classVal = null;
        let declarationParts = [];
        let className = identifiedClass.cssClass;

        className = escapeCssSelector(identifiedClass.cssClass, opts.breakpoints);

        if (className.includes(":") && className.indexOf(":") < className.indexOf("-")) {
            className = className.replace(":", String.fromCharCode(92) + ":");
        }

        cssClasses[className] = { rules: [], custom: false };

        if (identifiedClass.custom) {
            cssClasses[className].custom = true;
        }

        cssClasses[className].layer = identifiedClass.layer;

        cssClasses[className].rules = createClassRules(identifiedClass.cssClass, opts, customMap);

        if (cssClasses[className].rules.length == 0) delete cssClasses[className];
    });

    return cssClasses;
}

module.exports = process;

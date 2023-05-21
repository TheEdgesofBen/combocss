const fg = require("fast-glob");
const fs = require("fs");
const parse5 = require("parse5");
const postcss = require("postcss");
const { AtRule, Rule } = require("postcss");
const {
    isResponsive,
    getResponsiveSize,
    getResponsiveName,
    findLayerIndex,
    findNode,
    isIgnored,
    camelToDash,
    escapeCssSelector,
    currentFileClasses,
    splitStringByCSSVar,
    checkSpecialStartChars,
} = require("./utils");

let filesLastModified = {};
let classesMap = {};
let layersMap = {};

function process(opts) {
    let rawFilesClasses = {};
    let identifiedFilesClasses = {};
    let filesClasses = {};

    let { layersOrder, customClassesMap } = getCustomClassesMap(opts);

    rawFilesClasses = getRawFilesClasses(opts);

    Object.keys(rawFilesClasses).forEach((fileName) => {
        identifiedFilesClasses[fileName] = identifyCustomClasses(Array.from(rawFilesClasses[fileName]), opts, customClassesMap);
    });

    Object.keys(identifiedFilesClasses).forEach((fileName) => {
        filesClasses[fileName] = createClasses(identifiedFilesClasses[fileName], opts, customClassesMap);
    });

    updateOutputFile(filesClasses, opts, layersOrder);
}

function createNode(selector, selctorClass, opts) {
    let atRule = null;
    let newRule = null;
    let className = "." + selector;
    let node = null;

    newRule = new Rule({ selector: className });

    selctorClass.rules.forEach((rule) => {
        newRule.append(rule);
    });

    if (isResponsive(selector, opts)) {
        atRule = new AtRule({
            name: "media",
            params: "(min-width: " + getResponsiveSize(selector.replace(String.fromCharCode(92), "").split(":")[0], opts) + ")",
            value: getResponsiveSize(selector.split(":")[0], opts),
        });

        atRule.append(newRule);
        node = atRule;
    } else node = newRule;

    return node;
}

function updateOutputFile(filesClasses, opts, layersOrder) {
    let outFileData = null;
    let root = null;

    if (fs.existsSync(opts.output)) {
        outFileData = fs.readFileSync(opts.output);
    } else outFileData = "";

    root = postcss.parse(outFileData);

    if (root.nodes[0]?.type != "atrule" && root.nodes[0]?.name != "layer") {
        let layerOrderAtRuleNode = new AtRule({
            name: "layer",
            params: layersOrder.map((layerOrder) => layerOrder.replace(/[^\w-:]/g, "\\$&")).join(", "),
        });

        root.prepend(layerOrderAtRuleNode);
    }

    Object.keys(filesClasses).forEach((fileName) => {
        let classes = filesClasses[fileName];

        Object.keys(classes).forEach((selector) => {
            let newNode = null;
            let oldNode = null;
            let layer = null;
            let basicClassNode = null;

            if (classes[selector].layer) {
                layer = classes[selector].layer.replace(/[^\w-:]/g, "\\$&");
            }

            if (!classesMap[selector]) classesMap[selector] = [];

            if (!classesMap[selector].includes(fileName)) classesMap[selector].push(fileName);

            newNode = createNode(selector, classes[selector], opts);

            oldNode = findNode(newNode, layer, root);

            if (oldNode) oldNode.remove();

            if (!layer) {
                if (isResponsive(selector, opts)) {
                    let tempSelector = selector.replace(String.fromCharCode(92), "");
                    let basicClassNode = null;
                    let tempNode = null;

                    tempSelector = tempSelector.replace(getResponsiveName(selector, opts), "");

                    tempSelector = tempSelector.replace(":", "");

                    //console.log(selector, tempSelector, getResponsiveName(selector, opts));

                    tempNode = createNode(tempSelector, { rules: [] }, opts);
                    basicClassNode = findNode(tempNode, layer, root);

                    //console.log(basicClassNode);
                }

                root.append(newNode);
            } else {
                let rootLayerIndex = findLayerIndex(root, layer);

                if (!rootLayerIndex && rootLayerIndex !== 0) {
                    let layerNode = new AtRule({
                        name: "layer",
                        params: layer,
                    });

                    root.append(layerNode);

                    rootLayerIndex = findLayerIndex(root, layer);
                }

                if (isResponsive(selector, opts)) {
                    console.log(selector, selector.replace(String.fromCharCode(92), ""));

                    let tempNode = createNode(selector.replace(String.fromCharCode(92), ""), classes[selector], opts);
                    basicClassNode = findNode(tempNode, layer, root);
                }

                layersMap[selector] = layer;

                root.nodes[rootLayerIndex].append(newNode);
            }

            if (!currentFileClasses[fileName]) currentFileClasses[fileName] = new Set();

            if (!currentFileClasses[fileName].has(selector)) currentFileClasses[fileName].add(selector);
        });

        /*

        Object.keys(classes).forEach((selector) => {
            let newNode = null;
            let oldNode = null;

            if (!classesMap[selector]) classesMap[selector] = [];

            if (!classesMap[selector].includes(fileName)) classesMap[selector].push(fileName);

            newNode = createNode(selector, classes[selector], opts);

            oldNode = findNode(newNode, root);

            if (oldNode) oldNode.remove();

            root.append(newNode);

            if (!currentFileClasses[fileName]) currentFileClasses[fileName] = new Set();

            if (!currentFileClasses[fileName].has(selector)) currentFileClasses[fileName].add(selector);
        });

        */
    });

    Object.keys(classesMap).forEach((selector) => {
        classesMap[selector].forEach((fileName, fileNameIndex) => {
            if (filesClasses[fileName] && !filesClasses[fileName][selector]) {
                classesMap[selector].splice(fileNameIndex, 1);
            }
        });
    });

    Object.keys(classesMap).forEach((selector) => {
        let node = null;
        let foundNode = null;

        if (classesMap[selector].length == 0) {
            delete classesMap[selector];

            node = createNode(selector, { rules: [] }, opts);
            foundNode = findNode(node, layersMap[selector], root);

            delete layersMap[selector];

            if (foundNode) foundNode.remove();
        }
    });

    /*
    Object.keys(classesMap).forEach((selector) => {
        classesMap[selector].forEach((fileName, fileNameIndex) => {
            if (filesClasses[fileName] && !filesClasses[fileName][selector]) {
                classesMap[selector].splice(fileNameIndex, 1);
            }
        });
    });

    Object.keys(classesMap).forEach((selector) => {
        let node = null;
        let foundNode = null;

        if (classesMap[selector].length == 0) {
            delete classesMap[selector];

            node = createNode(selector, { rules: [] }, opts);
            foundNode = findNode(node, root);

            if (foundNode) foundNode.remove();
        }
    });
    */

    /*

    Object.keys(currentFileClasses).forEach((fileName) => {
        currentFileClasses[fileName].forEach((selector) => {
            if (!(filesClasses[fileName] || {})[selector]) {
                let selectorInUse = false;
                let node = null;
                let foundNode = null;

                currentFileClasses[fileName].delete(selector);

                Object.keys(currentFileClasses).forEach((_fileName) => {
                    if (currentFileClasses[_fileName].has(selector)) selectorInUse = true;
                });

                if (!selectorInUse) {
                    node = createNode(selector, { rules: [] }, opts);
                    foundNode = findNode(node, root);

                    if (foundNode) foundNode.remove();
                }
            }
        });
    });

    */

    let result = root.toResult();

    //console.log("End", currentFileClasses, result.css);

    fs.writeFileSync("./" + opts.output, result.css);
}

function getCustomClassesMap(opts) {
    let customClassesMap = {};
    let filesPaths = fg.sync(opts.custom || []);
    let filesContent = [];
    let layersOrder = [];

    filesPaths.forEach((filePath, filePathIndex) => {
        filesContent[filePathIndex] = fs.readFileSync(filePath, "utf8");
        layersOrder.push(filePath);
    });

    filesContent.forEach((fileContent, fileContentIndex) => {
        let filePath = filesPaths[fileContentIndex];
        let root = postcss.parse(fileContent);

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
                    customClassesMap[customClassName.slice(1)] = customClassMap;
                }

                if (customClassMap.combo) {
                    customClassMap.layer = filePath;
                }
            }
        });
    });

    return { layersOrder, customClassesMap };
}

function getRawFilesClasses(opts) {
    let rawFilesClasses = {};
    let { filesContent, filesPaths } = getFilesContent(opts.input, true);

    filesContent.forEach((fileContent, fileContentIndex) => {
        let classes = new Set();
        let filePath = filesPaths[fileContentIndex];

        if (filePath.includes(".vue")) {
            let tagContent = fileContent.match(/<template>([\s\S]*?.*)<\/template>/s)[0];
            let classTags = "";
            let classValues = [];

            if (tagContent.length == 0) return;

            classTags = (tagContent.match(/class="([\s\S]*?)"/g) || []).join(" ");

            if (!classTags) return;

            classValues = classTags.match(/class="([\s\S]*?)"/g);

            classValues.forEach((classValue, classValueIndex) => {
                classValue = classValue.split('"')[1];

                if ((classValue.match(/{([\s\S]*?)}/g) || []).length > 0 && classValue.indexOf("{") == 0 && classValue.indexOf("}") == classValue.length - 1) {
                    classValue = classValue.split("{")[1];
                    classValue = classValue.split("}")[0];

                    classValue.split(",").forEach((classObjProp) => {
                        let classObjPropKey = classObjProp.trim().split(":")[0];

                        if ((classObjPropKey.match(/'([\s\S]*?)'/g) || []).length > 0) {
                            classObjPropKey = classObjPropKey.split("'")[1];
                        }

                        if (classObjPropKey) classObjPropKey.match(/[^()\s]+(\(.*?\))?/g).forEach((classObjPropKeyPart) => classes.add(classObjPropKeyPart));
                    });
                } else {
                    if (classValue && (classValue.match(/'([\s\S]*?)'/g) || []).length == 0 && classValue.indexOf("'") != 0) {
                        classValue.match(/[^()\s]+(\(.*?\))?/g).forEach((value) => {
                            classes.add(value);
                        });
                    }
                }
            });
        } else if (filePath.includes(".html")) {
            let parseContent = parse5.parse(fileContent);

            if (parseContent.childNodes.length > 0) {
                let parseFragmentClasses = getHTMLClasses(parseContent);
                parseFragmentClasses.forEach((parseFragmentClass) => classes.add(parseFragmentClass));
            }
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

function getHTMLClasses(content) {
    let classes = [];

    (content.attrs || []).forEach((attr) => {
        if (attr.name == "class") classes.push(...attr.value.split(" "));
    });

    (content.childNodes || []).forEach((childNode) => {
        classes.push(...getHTMLClasses(childNode));
    });

    return classes;
}

function getComboClassPart(primaryClassPart) {
    const startingSpecialChars = getStartingSpecialChars(primaryClassPart);
    let comboClassPart = primaryClassPart;

    if (startingSpecialChars) comboClassPart = comboClassPart.replace(startingSpecialChars, "");

    return comboClassPart;
}

function getShortcutClassPart(primaryClassPart, customClassesMap = null) {
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
        if (!customClassesMap) {
            classParts.splice(classParts.length - 1, 1);
            shortcutClassPart = classParts.join("-");
        } else {
            /*
            classParts.splice(classParts.length - 1, 1);
            shortcutClassPart = classParts.join("-");
            
            */

            classParts.splice(classParts.length - 1, 1);

            shortcutClassPart = null;

            Object.keys(customClassesMap).forEach((customClassKey) => {
                let customClass = customClassesMap[customClassKey];

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

function identifyCustomClasses(classes, opts, customClassesMap) {
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

        let foundCustom = Object.keys(customClassesMap).find((customClass) => {
            return className == customClass;
        });

        if (!foundCustom) {
            foundCustom = Object.keys(customClassesMap).find((customClass) => {
                let { shortcutClassPart } = getShortcutClassPart(className, customClassesMap);
                return shortcutClassPart == customClass;
            });
        }

        identifiedClass = { cssClass: cssClass, custom: false };

        if (foundCustom) {
            identifiedClass.custom = true;
            identifiedClass.layer = customClassesMap[foundCustom].layer;
        }

        identifiedClasses.push(identifiedClass);
    });

    return identifiedClasses;
}

function getFilesContent(unsolvedFilesPaths) {
    let filesContent = [];
    let filesPaths = fg.sync(unsolvedFilesPaths);
    let filesPathsChanged = [];
    let modified = null;

    filesPaths.forEach((filePath) => {
        modified = fs.statSync(filePath).mtimeMs;

        if (!filesLastModified[filePath] || modified > filesLastModified[filePath]) {
            filesLastModified[filePath] = modified;
            let content = fs.readFileSync(filePath, "utf8");
            filesContent.push(content);
            filesPathsChanged.push(filePath);
        }
    });

    filesPaths = filesPathsChanged;

    return { filesContent, filesPaths };
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
        if (isImportantValue) {
            declarationParts[0] = declarationParts[0] + declarationParts[1];

            declarationParts.splice(1, 1);
        }

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

    /*
    if (primaryCustomClassPart.includes("mt")) {
        console.log(
            "inheritFromCustom",
            className,
            primaryCustomClassPart,
            primaryCustomClassPart.split(/\-(?![^\(]*\))/g)[primaryCustomClassPart.split(/\-(?![^\(]*\))/g).length - 1]
        );
    }
    */

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

function createClassRules(cssClass, opts, customClassesMap) {
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
    let { shortcutClassPart, shortcutClassEquivalent } = getShortcutClassPart(className, customClassesMap);
    let declarationParts = [];
    let classProp = null;

    if (customClassesMap[comboClassPart] && customClassesMap[comboClassPart].combo) {
        selectors = customClassesMap[comboClassPart].combo.split(" ").map((selector) => {
            return inheritFromCustom(selector, classParts[1], false);
        });
    } else if (customClassesMap[shortcutClassPart] && customClassesMap[shortcutClassPart].shortcut) {
        selectors = customClassesMap[shortcutClassPart].shortcut.split(" ").map((selector) => {
            return inheritFromCustom(selector, classParts[1], true, shortcutClassEquivalent);
        });
    } else selectors = [classParts[1]];

    if (customClassesMap[comboClassPart] && selectors.includes(comboClassPart)) {
        console.error("Error combo class includes it self: ", comboClassPart);

        return rules;
    }

    selectors.forEach((selector) => {
        classParts = getClassParts(selector, opts);
        comboClassPart = getComboClassPart(classParts[1]);

        let { shortcutClassPart } = getShortcutClassPart(classParts[1], customClassesMap);

        if (customClassesMap[comboClassPart]?.combo || customClassesMap[shortcutClassPart]?.shortcut) {
            let nextRules = createClassRules(selector, opts, customClassesMap);

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

    if (customClassesMap[getClassParts(cssClass, opts)[1]]) {
        customClassesMap[getClassParts(cssClass, opts)[1]].props.forEach((nextRule) => {
            rules.push(nextRule);
        });
    }

    return rules;
}

function createClasses(identifiedClasses, opts, customClassesMap) {
    let classes = {};

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

        classes[className] = { rules: [], custom: false };

        if (identifiedClass.custom) {
            classes[className].custom = true;
        }

        classes[className].layer = identifiedClass.layer;

        classes[className].rules = createClassRules(identifiedClass.cssClass, opts, customClassesMap);

        if (classes[className].rules.length == 0) delete classes[className];
    });

    return classes;
}

module.exports = process;

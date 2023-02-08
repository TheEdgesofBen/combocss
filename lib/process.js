const fg = require("fast-glob");
const fs = require("fs");
const parse5 = require("parse5");
const postcss = require("postcss");
const { AtRule, Rule } = require("postcss");
const { isResponsive, getResponsiveSize, findNode, isIgnored, camelToDash, escapeCssSelector, currentFileClasses } = require("./utils");

var filesLastModified = {};

function process(opts) {
    let rawFilesClasses = {};
    let identifiedFilesClasses = {};
    let customClassesMap = {};
    let filesClasses = {};

    customClassesMap = getCustomClassesMap(opts);

    rawFilesClasses = getRawFilesClasses(opts);

    Object.keys(rawFilesClasses).forEach((fileName) => {
        identifiedFilesClasses[fileName] = identifyCustomClasses(Array.from(rawFilesClasses[fileName]), opts, customClassesMap);
    });

    Object.keys(identifiedFilesClasses).forEach((fileName) => {
        filesClasses[fileName] = createClasses(identifiedFilesClasses[fileName], opts, customClassesMap);
    });

    updateOutputFile(filesClasses, opts);
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
            params: "(max-width: " + getResponsiveSize(selector.replace(String.fromCharCode(92), "").split(":")[0], opts) + ")",
            value: getResponsiveSize(selector.split(":")[0], opts),
        });

        atRule.append(newRule);
        node = atRule;
    } else node = newRule;

    return node;
}

function updateOutputFile(filesClasses, opts) {
    let outFileData = null;
    let root = null;

    if (fs.existsSync(opts.output)) {
        outFileData = fs.readFileSync(opts.output);
    } else outFileData = "";

    root = postcss.parse(outFileData);

    Object.keys(filesClasses).forEach((fileName) => {
        let classes = filesClasses[fileName];

        Object.keys(classes).forEach((selector) => {
            let newNode = null;
            let oldNode = null;

            newNode = createNode(selector, classes[selector], opts);

            oldNode = findNode(newNode, root);

            if (oldNode) oldNode.remove();

            root.append(newNode);

            if (!currentFileClasses[fileName]) currentFileClasses[fileName] = new Set();

            if (!currentFileClasses[fileName].has(selector)) currentFileClasses[fileName].add(selector);
        });
    });

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

    let result = root.toResult();

    //console.log("End", currentFileClasses, result.css);

    fs.writeFileSync("./" + opts.output[0], result.css);
}

function getCustomClassesMap(opts) {
    let customClassesMap = {};
    let filesPaths = fg.sync(opts.custom || []);
    let filesContent = [];

    filesPaths.forEach((filePath, filePathIndex) => {
        filesContent[filePathIndex] = fs.readFileSync(filePath, "utf8");
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
            }
        });
    });

    return customClassesMap;
}

function getRawFilesClasses(opts) {
    let rawFilesClasses = {};
    let { filesContent, filesPaths } = getFilesContent(opts.input, true);

    filesContent.forEach((fileContent, fileContentIndex) => {
        let classes = new Set();
        let filePath = filesPaths[fileContentIndex];

        if (filePath.includes(".vue")) {
            let tagContent = fileContent.match(/<template>([\s\S]*?)<\/template>/)[0];
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

    content.childNodes.forEach((childNode) => {
        if ((childNode.childNodes || []).length > 0) classes.push(...getHTMLClasses(childNode));
    });

    return classes;
}

function getComboClassPart(primaryClassPart) {
    const startingSpecialChars = getStartingSpecialChars(primaryClassPart);
    let comboClassPart = primaryClassPart;

    if (startingSpecialChars) comboClassPart = comboClassPart.replace(startingSpecialChars, "");

    return comboClassPart;
}

function getShortcutClassPart(primaryClassPart) {
    const startingSpecialChars = getStartingSpecialChars(primaryClassPart);
    let shortcutClassPart = primaryClassPart;
    let classParts = primaryClassPart.split("-");

    if (startingSpecialChars) shortcutClassPart = shortcutClassPart.replace(startingSpecialChars, "");

    if (classParts.length > 1) {
        classParts.splice(classParts.length - 1, 1);
        shortcutClassPart = classParts.join("-");
    } else if (classParts.length == 1) {
        shortcutClassPart = classParts[0];
    }

    return shortcutClassPart;
}

function identifyCustomClasses(classes, opts, customClassesMap) {
    let identifiedClass = {};
    let identifiedClasses = [];

    classes.forEach((cssClass) => {
        let foundCustom = Object.keys(customClassesMap).find((customClass) => {
            return getClassParts(cssClass, opts)[1] == customClass;
        });

        if (!foundCustom) {
            foundCustom = Object.keys(customClassesMap).find((customClass) => {
                return getShortcutClassPart(getClassParts(cssClass, opts)[1]) == customClass;
            });
        }

        identifiedClass = { cssClass: cssClass, custom: false };

        if (foundCustom) {
            identifiedClass.custom = true;
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
    let isNegativeValue = false;
    let isImportantValue = false;

    if (className.indexOf("-") == 0 || className.indexOf("-") == 1) isNegativeValue = true;
    if (className.indexOf("!") == 0) isImportantValue = true;

    declarationParts = className.split(":")[0].split("-");

    if (declarationParts[1] && declarationParts[1].match(/(\(.*?\))/)) {
        let valueFunc = declarationParts[1].match(/(\(.*?\))/)[0];
        let resolvedValueFunc = valueFunc.replaceAll("_", " ");
        declarationParts[1] = declarationParts[1].replace(valueFunc, resolvedValueFunc);
    }

    if (isNegativeValue && declarationParts[1]) {
        declarationParts.splice(0, 1);
        declarationParts[1] = "-" + declarationParts[1];
    }

    if (isImportantValue && declarationParts[1]) {
        declarationParts[0].slice(0, 1);
        declarationParts[1] = declarationParts[1] + " !important";
    }

    return declarationParts;
}

function getStartingSpecialChars(primaryClassName) {
    const match = primaryClassName.match(/^[-!]+/);
    return match ? match[0] : "";
}

function inheritFromCustom(className, primaryCustomClassPart, isShortcut = false) {
    const startingSpecialChars = getStartingSpecialChars(className);
    const customStartingSpecialChars = getStartingSpecialChars(primaryCustomClassPart);

    if (customStartingSpecialChars) {
        if (startingSpecialChars) {
            if (customStartingSpecialChars.indexOf("-") > -1 && startingSpecialChars.indexOf("-") == -1) {
                className = "-" + className;
            }
            if (customStartingSpecialChars.indexOf("!") == 0 && startingSpecialChars.indexOf("!") == -1) {
                className = "!" + className;
            }
        } else className = customStartingSpecialChars + className;
    }

    if (isShortcut) {
        className = className + "-" + primaryCustomClassPart.split("-")[primaryCustomClassPart.split("-").length - 1];
    }

    return className;
}

function createClassRules(cssClass, opts, customClassesMap) {
    let rules = [];
    let selectors = null;
    let classParts = getClassParts(cssClass, opts);
    let declarationParts = [];
    let classProp = null;

    if (customClassesMap[getComboClassPart(classParts[1])] && customClassesMap[getComboClassPart(classParts[1])].combo) {
        selectors = customClassesMap[getComboClassPart(classParts[1])].combo.split(" ").map((selector) => {
            return inheritFromCustom(selector, classParts[1], false);
        });
    } else if (customClassesMap[getShortcutClassPart(classParts[1])] && customClassesMap[getShortcutClassPart(classParts[1])].shortcut) {
        selectors = customClassesMap[getShortcutClassPart(classParts[1])].shortcut.split(" ").map((selector) => {
            return inheritFromCustom(selector, classParts[1], true);
        });
    } else selectors = [classParts[1]];

    selectors.forEach((selector) => {
        classParts = getClassParts(selector, opts);

        if (customClassesMap[getComboClassPart(classParts[1])]?.combo || customClassesMap[getShortcutClassPart(classParts[1])]?.shortcut) {
            let nextRules = createClassRules(selector, opts, customClassesMap);

            nextRules.forEach((nextRule) => {
                let rulePropTaken = rules.find((rule) => nextRule.prop == rule.prop);

                if (!rulePropTaken) rules.push(nextRule);
            });
        } else {
            if (cssClass.includes(":")) {
                declarationParts = getDeclarationParts(classParts[1]);
            } else declarationParts = getDeclarationParts(selector);

            classProp = getClassProp(declarationParts[0], opts);

            declarationParts.splice(0, 1);

            declarationParts = declarationParts.map((declarationPart) => camelToDash(declarationPart));

            if (cssClass && declarationParts.join("")) {
                let nextRule = { prop: classProp, value: declarationParts.join(" ") };
                let rulePropTaken = rules.find((rule) => nextRule.prop == rule.prop);

                if (!rulePropTaken) rules.push(nextRule);
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

        classes[className].rules = createClassRules(identifiedClass.cssClass, opts, customClassesMap);

        if (classes[className].rules.length == 0) delete classes[className];
    });

    return classes;
}

module.exports = process;

import postcss, { parse, AtRule, Rule } from 'postcss';
import autoprefixer from 'autoprefixer';

// Checks if selector is responsive combo css
function isResponsive(selector, breakpoints) {
    let isResponsiveSelector = Object.keys(breakpoints).find((breakpoint) => {
        return selector.replace(String.fromCharCode(92), "").indexOf(breakpoint) == 0;
    });

    if (isResponsiveSelector) return true;

    return false;
}

// Gets combo css responsive size
function getResponsiveSize(size, breakpoints) {
    return breakpoints[size];
}

// Converts camel case to dash string
function camelToDash(str) {
    if (str != str.toLowerCase()) {
        str = str.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
    }
    return str;
}

// Escapes css selector
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

// Splits string by css var
function splitStringByCSSVar(str) {
    const regex = /(\bvar\(-[a-zA-Z]+\))/g;
    return str.split(regex);
}

// Checks combo css class name for special start chars
function checkSpecialStartChars(className) {
    let isNegativeValue = false;
    let isImportantValue = false;

    if (className.indexOf("-") == 0 || (className.indexOf("!") == 0 && className.indexOf("-") == 1)) isNegativeValue = true;
    if (className.indexOf("!") == 0) isImportantValue = true;

    return { isNegativeValue, isImportantValue };
}

// Gets custom map from data and adds layer identifier
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

// Gets combo class part without the starting special chars
function getComboClassPart(primaryClassPart) {
    const startingSpecialChars = getStartingSpecialChars(primaryClassPart);
    let comboClassPart = primaryClassPart;

    if (startingSpecialChars) comboClassPart = comboClassPart.replace(startingSpecialChars, "");

    return comboClassPart;
}

// Gets shortcut class part without the starting special chars
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

// Identifies combo css classes like combos and shortcuts
function identifyClasses(classes, customMap, breakpoints = {}) {
    let identifiedClass = {};
    let identifiedClasses = [];

    classes.forEach((cssClass) => {
        let className = getClassParts(cssClass, breakpoints)[1];
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

// Gets combo css class prop
function getClassProp(rawClassProp) {
    let classProp = camelToDash(rawClassProp);

    return classProp;
}

// Gets combo css class parts
function getClassParts(cssClass, breakpoints) {
    let classRawParts = [];
    let classParts = [[], "", []];
    let mainPartFound = false;
    let responsiveSizes = [];

    if (breakpoints) {
        responsiveSizes = Object.keys(breakpoints || {}).map((breakpoint) => breakpoint);
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

// Gets combo css declaration parts
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

// Gets starting special chars in class name
function getStartingSpecialChars(primaryClassName) {
    const match = primaryClassName.match(/^[-!]+/);
    return match ? match[0] : "";
}

// Inherits from combo css custom
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

// Creates combo css class rules
function createClassRules(cssClass, customMap, breakpoints) {
    let rules = [];
    let selectors = null;

    let classParts = getClassParts(cssClass, breakpoints);
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
        classParts = getClassParts(selector, breakpoints);
        comboClassPart = getComboClassPart(classParts[1]);

        let { shortcutClassPart } = getShortcutClassPart(classParts[1], customMap);

        if (customMap[comboClassPart]?.combo || customMap[shortcutClassPart]?.shortcut) {
            let nextRules = createClassRules(selector, customMap, breakpoints);

            nextRules.forEach((nextRule) => {
                rules.find((rule) => nextRule.prop == rule.prop);

                rules.push(nextRule);
            });
        } else {
            if (cssClass.includes(":")) {
                declarationParts = getDeclarationParts(classParts[1]);
            } else declarationParts = getDeclarationParts(selector);

            classProp = getClassProp(declarationParts[0]);

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
                rules.find((rule) => nextRule.prop == rule.prop);

                rules.push(nextRule);
            }
        }
    });

    if (customMap[getClassParts(cssClass, breakpoints)[1]]) {
        customMap[getClassParts(cssClass, breakpoints)[1]].props.forEach((nextRule) => {
            rules.push(nextRule);
        });
    }

    return rules;
}

// Creates combo css class data
function createCSSClassesData(identifiedClasses, customMap, breakpoints = {}) {
    let cssClasses = {};

    identifiedClasses.forEach((identifiedClass, identifiedClassIndex) => {
        let className = identifiedClass.cssClass;

        className = escapeCssSelector(identifiedClass.cssClass, breakpoints);

        if (className.includes(":") && className.indexOf(":") < className.indexOf("-")) {
            className = className.replace(":", String.fromCharCode(92) + ":");
        }

        cssClasses[className] = { rules: [], custom: false };

        if (identifiedClass.custom) {
            cssClasses[className].custom = true;
        }

        cssClasses[className].layer = identifiedClass.layer;

        cssClasses[className].rules = createClassRules(identifiedClass.cssClass, customMap, breakpoints);

        if (cssClasses[className].rules.length == 0) delete cssClasses[className];
    });

    return cssClasses;
}

let stylelint;

// Parses string css to postcss
function stringCSSToPostCSS(cssData) {
    let root = parse(cssData);

    return root;
}

// Parsespostcss to string css
function postCSSToStringCSS(root) {
    let stringCSS = root.toResult();

    return stringCSS;
}

// Creates combo css node and rules and if the selector is responsive wraps it inside a @media at rule
function createNode(selector, selctorClass, breakpoints) {
    let atRule = null;
    let newRule = null;
    let className = "." + selector;
    let node = null;

    newRule = new Rule({ selector: className });

    selctorClass.rules.forEach((rule) => {
        newRule.append(rule);
    });

    if (isResponsive(selector, breakpoints)) {
        atRule = new AtRule({
            name: "media",
            params: "(min-width: " + getResponsiveSize(selector.replace(String.fromCharCode(92), "").split(":")[0], breakpoints) + ")",
            value: getResponsiveSize(selector.split(":")[0], breakpoints),
        });

        atRule.append(newRule);
        node = atRule;
    } else node = newRule;

    return node;
}

// Finds combo css node in root with an optional layer scope
function findNode(node, layer, root) {
    let foundNode = false;

    root.nodes.forEach((rootNode) => {
        if (foundNode) return;

        if (layer && rootNode.name == "layer" && rootNode.params == layer) {
            foundNode = findNode(node, null, rootNode);
        } else if (!layer) {
            if (node.type == "atrule") {
                if (rootNode.name == node.name && rootNode.params == node.params && rootNode.nodes[0]?.selector == node.nodes[0]?.selector) {
                    foundNode = rootNode;
                }
            } else if (node.type == "rule") {
                if (rootNode.selector == node.selector) {
                    foundNode = rootNode;
                }
            }
        }
    });

    return foundNode;
}

// Finds layer index in root
function findLayerIndex(root, layer) {
    let layerIndex = null;

    root.nodes.forEach((node, nodeIndex) => {
        if (node.type == "atrule") {
            if (node.name == "layer" && node.params == layer) {
                layerIndex = nodeIndex;
            }
        }
    });

    return layerIndex;
}

// Appends combo css node to root and removes old node with same selector and @media at rule inside root
function appendClassNodesToRoot(classes, root, type, breakpoints, layersMap) {
    let lastNoneResponsiveNode = null;

    root.nodes.forEach((node) => {
        if (type == "nonResponsive") {
            lastNoneResponsiveNode = node;
        }
    });

    Object.keys(classes).forEach((selector) => {
        let newNode = null;
        let oldNode = null;
        let layer = null;

        if (layersMap && classes[selector].layer) {
            layer = classes[selector].layer.replace(/[^\w-:]/g, "\\$&");
        }

        newNode = createNode(selector, classes[selector], breakpoints);

        oldNode = findNode(newNode, layer, root);

        if (oldNode) oldNode.remove();

        if (!layer) {
            if (type == "responsive") {
                if (lastNoneResponsiveNode) {
                    lastNoneResponsiveNode.after(newNode);
                } else root.append(newNode);
            } else root.append(newNode);
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

            if (layersMap) layersMap[selector] = layer;

            root.nodes[rootLayerIndex].append(newNode);
        }
    });

    if (layersMap) return { root, layersMap };
    else return root;
}

// Enriches css string with postcss plugins
async function enrichCSSWithPlugins(css, plugins = ["stylelint, autoprefixer"]) {
    let enrichedCSS = css;

    if (plugins.includes("stylelint")) {
        let result = await stylelint.lint({ code: css });

        if (result.errored) {
            return false;
        }
    }

    if (plugins.includes("autoprefixer")) {
        enrichedCSS = await new Promise((resolve, reject) => {
            postcss([autoprefixer])
                .process(css)
                .then((enrichedCSS) => {
                    enrichedCSS.warnings().forEach((warn) => {
                        //console.warn(warn.toString());
                    });

                    resolve(enrichedCSS.css);
                });
        });
    }

    return enrichedCSS;
}

// Process raw file classess by identiy custom combo classes and return created css combo classes
async function processCombo(rawFileClasses, opts = {}) {
    let identifiedFileClasses = {};
    let classesData = {};

    let customMap = getCustomMap(opts.custom || "");

    identifiedFileClasses = identifyClasses(rawFileClasses, customMap, opts.breakpoints);

    classesData = createCSSClassesData(identifiedFileClasses, customMap, opts.breakpoints);

    return await createComboCSSClasses(classesData, opts.breakpoints);
}

// Creates css combo classes first non-responsive and than responsive classes
async function createComboCSSClasses(classesData, breakpoints = {}) {
    let root = null;
    let classes = {
        nonResponsive: {},
        responsive: {},
    };

    if (Object.keys(classesData || {}).length == 0) return console.log("ComboCSS no classes");

    root = stringCSSToPostCSS("");

    /*
    if (root.nodes[0]?.type != "atrule" && root.nodes[0]?.name != "layer") {
        root = addLayerNodeAtRoot(root, layersOrder);
    }
    */

    Object.keys(classesData).forEach((selector) => {
        if (isResponsive(selector, breakpoints)) {
            classes.responsive[selector] = classesData[selector];
        } else classes.nonResponsive[selector] = classesData[selector];
    });

    Object.keys(classes).forEach((type) => {
        root = appendClassNodesToRoot(classes[type], root, type, breakpoints);
    });

    let result = postCSSToStringCSS(root);

    //console.log("End", currentFileClasses, result.css);

    let enrichedCSS = await enrichCSSWithPlugins(result.css, []);

    if (enrichedCSS) {
        return enrichedCSS;
    } else console.log("Error creating combo");
}

export { processCombo as combocss };

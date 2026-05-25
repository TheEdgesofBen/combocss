import { camelToDash, escapeCssSelector, splitStringByCSSVar, checkSpecialStartChars } from "./utils.js";

function splitOutsideGroups(value, separator) {
    const parts = [];
    let current = "";
    let depth = 0;
    let quote = null;
    let escaped = false;

    for (const char of value) {
        if (escaped) {
            current += char;
            escaped = false;
            continue;
        }

        if (char === "\\") {
            current += char;
            escaped = true;
            continue;
        }

        if (quote) {
            current += char;
            if (char === quote) quote = null;
            continue;
        }

        if (char === '"' || char === "'") {
            current += char;
            quote = char;
            continue;
        }

        if (char === "(" || char === "[" || char === "{") depth += 1;
        if (char === ")" || char === "]" || char === "}") depth = Math.max(0, depth - 1);

        if (char === separator && depth === 0) {
            parts.push(current);
            current = "";
        } else {
            current += char;
        }
    }

    parts.push(current);
    return parts;
}

function splitClassTokens(value) {
    return splitOutsideGroups(value, " ").filter(Boolean);
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
    let classParts = splitOutsideGroups(primaryClassPart, "-");

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
    let identifiedClasses = [];

    classes.forEach((cssClass) => {
        let className = getClassParts(cssClass, breakpoints)[1];
        let { isNegativeValue, isImportantValue } = checkSpecialStartChars(className);

        if (isNegativeValue) className = className.slice(1);
        if (isImportantValue) className = className.slice(1);

        let foundCustom = Object.keys(customMap).find((customClass) => className == customClass);

        if (!foundCustom) {
            foundCustom = Object.keys(customMap).find((customClass) => {
                let { shortcutClassPart } = getShortcutClassPart(className, customMap);
                return shortcutClassPart == customClass;
            });
        }

        let identifiedClass = { cssClass: cssClass, custom: false };

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
    return camelToDash(rawClassProp);
}

// Gets combo css class parts
function getClassParts(cssClass, breakpoints) {
    let classParts = [[], "", []];
    let mainPartFound = false;
    let responsiveSizes = Object.keys(breakpoints || {});

    splitOutsideGroups(cssClass, ":").forEach((classPart) => {
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
    let { isNegativeValue, isImportantValue } = checkSpecialStartChars(className);
    let declarationParts = splitOutsideGroups(className.split(":")[0], "-");

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
            if (customStartingSpecialChars.indexOf("-") > -1 && startingSpecialChars.indexOf("-") == -1) className = "-" + className;
            else if (customStartingSpecialChars.indexOf("-") > -1 && startingSpecialChars.indexOf("-") > -1) isNegativeValue = true;

            if (customStartingSpecialChars.indexOf("!") == 0 && startingSpecialChars.indexOf("!") == -1) className = "!" + className;
            else if (customStartingSpecialChars.indexOf("!") == 0 && startingSpecialChars.indexOf("!") == 0) isImportantValue = true;
        } else {
            className = customStartingSpecialChars + className;
            if (customStartingSpecialChars.indexOf("-") > -1) isNegativeValue = true;
            if (customStartingSpecialChars.indexOf("!") == 0) isImportantValue = true;
        }
    }

    if (isShortcut) {
        if (isNegativeValue) primaryCustomClassPart = primaryCustomClassPart.replace("-", "");
        if (isImportantValue) primaryCustomClassPart = primaryCustomClassPart.replace("!", "");
        className = className + primaryCustomClassPart.replace(shortcutClassEquivalent, "");
    }

    return className;
}

function addDiagnostic(diagnostics, diagnostic) {
    if (diagnostics) diagnostics.push(diagnostic);
}

// Creates combo css class rules
function createClassRules(cssClass, customMap, breakpoints, context = {}) {
    let rules = [];
    let selectors = null;
    let stack = context.stack || [];
    let diagnostics = context.diagnostics;
    let strict = Boolean(context.strict);

    let classParts = getClassParts(cssClass, breakpoints);
    let className = classParts[1];
    let { isNegativeValue, isImportantValue } = checkSpecialStartChars(className);

    if (isNegativeValue) className = className.slice(1);
    if (isImportantValue) className = className.slice(1);

    let comboClassPart = getComboClassPart(className);
    let { shortcutClassPart, shortcutClassEquivalent } = getShortcutClassPart(className, customMap);
    let declarationParts = [];
    let classProp = null;
    let nextStackKey = customMap[comboClassPart]?.combo ? comboClassPart : customMap[shortcutClassPart]?.shortcut ? shortcutClassPart : null;

    if (nextStackKey && stack.includes(nextStackKey)) {
        addDiagnostic(diagnostics, {
            type: "circular-combo",
            severity: "error",
            className: nextStackKey,
            chain: [...stack, nextStackKey],
            message: `Circular ComboCSS custom class chain detected: ${[...stack, nextStackKey].join(" -> ")}`,
        });
        return rules;
    }

    if (customMap[comboClassPart] && customMap[comboClassPart].combo) {
        selectors = splitClassTokens(customMap[comboClassPart].combo).map((selector) => inheritFromCustom(selector, classParts[1], false));
    } else if (customMap[shortcutClassPart] && customMap[shortcutClassPart].shortcut) {
        selectors = splitClassTokens(customMap[shortcutClassPart].shortcut).map((selector) => inheritFromCustom(selector, classParts[1], true, shortcutClassEquivalent));
    } else selectors = [classParts[1]];

    selectors.forEach((selector) => {
        classParts = getClassParts(selector, breakpoints);
        comboClassPart = getComboClassPart(classParts[1]);

        let { shortcutClassPart } = getShortcutClassPart(classParts[1], customMap);

        if (customMap[comboClassPart]?.combo || customMap[shortcutClassPart]?.shortcut) {
            let nextRules = createClassRules(selector, customMap, breakpoints, {
                ...context,
                stack: nextStackKey ? [...stack, nextStackKey] : stack,
            });

            nextRules.forEach((nextRule) => rules.push(nextRule));
        } else {
            declarationParts = getDeclarationParts(cssClass.includes(":") ? classParts[1] : selector);
            classProp = getClassProp(declarationParts[0]);
            declarationParts.splice(0, 1);

            declarationParts = declarationParts.map((declarationPart) => {
                let cssVarSplits = splitStringByCSSVar(declarationPart);

                cssVarSplits = cssVarSplits.map((split) => {
                    if (split?.match(/(\(.*?\))/)) return split;
                    return camelToDash(split);
                });

                return cssVarSplits.join("");
            });

            if (cssClass && declarationParts.join("")) {
                rules.push({ prop: classProp, value: declarationParts.join(" ") });
            } else if (strict) {
                addDiagnostic(diagnostics, {
                    type: "invalid-class",
                    severity: "warning",
                    className: selector,
                    message: `Could not create a declaration for class '${selector}'`,
                });
            }
        }
    });

    if (customMap[getClassParts(cssClass, breakpoints)[1]]) {
        customMap[getClassParts(cssClass, breakpoints)[1]].props.forEach((nextRule) => rules.push(nextRule));
    }

    return rules;
}

// Creates combo css class data
function createCSSClassesData(identifiedClasses, customMap, breakpoints = {}, opts = {}) {
    let cssClasses = {};
    let diagnostics = opts.diagnostics || [];

    identifiedClasses.forEach((identifiedClass) => {
        let className = escapeCssSelector(identifiedClass.cssClass, breakpoints);

        if (className.includes(":") && className.indexOf(":") < className.indexOf("-")) {
            className = className.replace(":", String.fromCharCode(92) + ":");
        }

        cssClasses[className] = { rules: [], custom: false };

        if (identifiedClass.custom) cssClasses[className].custom = true;

        cssClasses[className].layer = identifiedClass.layer;
        cssClasses[className].rules = createClassRules(identifiedClass.cssClass, customMap, breakpoints, {
            diagnostics,
            strict: opts.strict,
            stack: [],
        });

        if (cssClasses[className].rules.length == 0) delete cssClasses[className];
    });

    return cssClasses;
}

export { identifyClasses, createCSSClassesData, getClassParts, getDeclarationParts, splitOutsideGroups };

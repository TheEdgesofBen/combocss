import { camelToDash, escapeCssSelector, splitStringByCSSVar, checkSpecialStartChars } from "./utils.js";

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
                let rulePropTaken = rules.find((rule) => nextRule.prop == rule.prop);

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
                let rulePropTaken = rules.find((rule) => nextRule.prop == rule.prop);

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
        let classParts = [];
        let classProp = null;
        let classVal = null;
        let declarationParts = [];
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

export { identifyClasses, createCSSClassesData };

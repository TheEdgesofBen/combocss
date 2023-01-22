const currentFileClasses = new Set();

function isResponsive(selector, opts) {
    let isResponsive = Object.keys(opts.breakpoints).find((breakpoint) => {
        return selector.replace(String.fromCharCode(92), "").indexOf(breakpoint) == 0;
    });

    if (isResponsive) return true;

    return false;
}

function getResponsiveSize(size, opts) {
    return opts.breakpoints[size];
}

function findNode(node, root) {
    let foundNode = false;

    root.nodes.forEach((rootNode) => {
        if (foundNode) return;

        if (node.type == "atrule") {
            if (rootNode.name == node.name && rootNode.params == node.params && rootNode.nodes[0]?.selector == node.nodes[0]?.selector) {
                foundNode = rootNode;
            }
        } else if (node.type == "rule") {
            if (rootNode.selector == node.selector) {
                foundNode = rootNode;
            }
        }
    });

    return foundNode;
}

function isIgnored(className, opts) {
    let ignoredPrefix = opts.ignore.prefix.find((prefix) => {
        return className.indexOf(prefix) == 0;
    });

    if (ignoredPrefix) return true;

    let ignoredSuffix = opts.ignore.suffix.find((suffix) => {
        return className.indexOf(suffix) == className.length - suffix.length - 1;
    });

    if (ignoredSuffix) return true;

    let ignoredClass = opts.ignore.class.find((ignoredClassName) => {
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
    selector = selector.replace(/[^\w-:]/g, "\\$&");

    if (selectorParts.length > 1) {
        selector = "";

        selectorParts.forEach((selectorPart, selectorPartIndex) => {
            if (Object.keys(breakpoints || {}).includes(selectorPart)) {
                selector += selectorPart + ":";
            } else {
                selector += selectorPart;

                if (selectorPartIndex + 1 < selectorParts.length) {
                    selector += String.fromCharCode(92) + ":" + selectorParts[selectorPartIndex + 1] + ":";
                }
            }
        });
    }

    return selector;
}

module.exports = {
    currentFileClasses: currentFileClasses,
    isResponsive: isResponsive,
    getResponsiveSize: getResponsiveSize,
    findNode: findNode,
    isIgnored: isIgnored,
    camelToDash: camelToDash,
    escapeCssSelector: escapeCssSelector,
};

const { AtRule, Rule } = require("postcss");
const { isResponsive, getResponsiveSize } = require("./utils");

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

module.exports = {
    createNode: createNode,
    findNode: findNode,
    findLayerIndex: findLayerIndex,
};

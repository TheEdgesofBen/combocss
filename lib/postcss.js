const postcss = require("postcss");
const { AtRule, Rule } = require("postcss");
const { isResponsive, getResponsiveSize } = require("./utils");

function stringCSSToPostCSS(cssData) {
    let root = postcss.parse(cssData);

    return root;
}

function postCSSToStringCSS(root) {
    let stringCSS = root.toResult();

    return stringCSS;
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

function appendClassNodesToRoot(classes, root, layersMap, type, opts) {
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

        if (classes[selector].layer) {
            layer = classes[selector].layer.replace(/[^\w-:]/g, "\\$&");
        }

        newNode = createNode(selector, classes[selector], opts);

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

            layersMap[selector] = layer;

            root.nodes[rootLayerIndex].append(newNode);
        }
    });

    return { root, layersMap };
}

function addLayerNodeAtRoot(root, layersOrder) {
    let layerOrderAtRuleNode = new AtRule({
        name: "layer",
        params: layersOrder.map((layerOrder) => layerOrder.replace(/[^\w-:]/g, "\\$&")).join(", "),
    });

    root.prepend(layerOrderAtRuleNode);

    return root;
}

function removeNodeBySelectorInRoot(selector, root, layersMap, opts) {
    let node = createNode(selector, { rules: [] }, opts);
    let foundNode = findNode(node, layersMap[selector], root);

    if (foundNode) foundNode.remove();

    return root;
}

module.exports = {
    stringCSSToPostCSS: stringCSSToPostCSS,
    postCSSToStringCSS: postCSSToStringCSS,
    createNode: createNode,
    findNode: findNode,
    findLayerIndex: findLayerIndex,
    addLayerNodeAtRoot: addLayerNodeAtRoot,
    appendClassNodesToRoot: appendClassNodesToRoot,
    removeNodeBySelectorInRoot: removeNodeBySelectorInRoot,
};

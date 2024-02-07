import postcss from "postcss";
import autoprefixer from "autoprefixer";
import { AtRule, Rule, parse } from "postcss";
import { isResponsive, getResponsiveSize } from "./utils.js";
import { stylelint } from "./nodeOnly.js";

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

// Adds layer node to root
function addLayerNodeAtRoot(root, layersOrder) {
    let layerOrderAtRuleNode = new AtRule({
        name: "layer",
        params: layersOrder.map((layerOrder) => layerOrder.replace(/[^\w-:]/g, "\\$&")).join(", "),
    });

    root.prepend(layerOrderAtRuleNode);

    return root;
}

// Removes old node with same selector and @media at rule with optional layer scope inside root
function removeNodeBySelectorInRoot(selector, root, layersMap, breakpoints) {
    let node = createNode(selector, { rules: [] }, breakpoints);
    let foundNode = findNode(node, layersMap[selector], root);

    if (foundNode) foundNode.remove();

    return root;
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

export {
    stringCSSToPostCSS,
    postCSSToStringCSS,
    createNode,
    findNode,
    findLayerIndex,
    addLayerNodeAtRoot,
    appendClassNodesToRoot,
    removeNodeBySelectorInRoot,
    enrichCSSWithPlugins,
};

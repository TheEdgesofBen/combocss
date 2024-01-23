const parse5 = require("parse5");

function extractHTMLClasses(fileContent, classes) {
    let parseContent = parse5.parse(fileContent);

    if (parseContent.childNodes.length > 0) {
        let parseFragmentClasses = getHTMLClasses(parseContent);
        parseFragmentClasses.forEach((parseFragmentClass) => classes.add(parseFragmentClass));
    }

    return classes;
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

module.exports = {
    extractHTMLClasses: extractHTMLClasses,
};

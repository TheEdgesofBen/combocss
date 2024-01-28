const parse5 = require("parse5");

// Extracts file classes from a html file in class attributes
function extractHTMLClasses(data, classes) {
    let parseContent = parse5.parse(data);

    if (parseContent.childNodes.length > 0) {
        let parseFragmentClasses = getHTMLClasses(parseContent);
        parseFragmentClasses.forEach((parseFragmentClass) => classes.add(parseFragmentClass));
    }

    return classes;
}

// Gets all html class attributes
function getHTMLClasses(data) {
    let classes = [];

    (data.attrs || []).forEach((attr) => {
        if (attr.name == "class") classes.push(...attr.value.split(" "));
    });

    (data.childNodes || []).forEach((childNode) => {
        classes.push(...getHTMLClasses(childNode));
    });

    return classes;
}

module.exports = {
    extractHTMLClasses: extractHTMLClasses,
};

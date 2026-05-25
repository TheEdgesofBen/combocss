function shouldIgnoreExtractedClass(className) {
    return !className || className.includes("${") || className.includes("}") || className.includes("`");
}

function addClassTokens(value, classes) {
    if (!value || value.includes("${")) return;
    value.match(/[^()\s]+(\(.*?\))?/g)?.forEach((className) => {
        if (!shouldIgnoreExtractedClass(className)) classes.add(className);
    });
}

function extractObjectClassKeys(value, classes) {
    value.split(",").forEach((classObjProp) => {
        let classObjPropKey = classObjProp.trim().split(":")[0]?.trim();

        if (!classObjPropKey) return;

        classObjPropKey = classObjPropKey.replace(/^['"`]/, "").replace(/['"`]$/, "");
        addClassTokens(classObjPropKey, classes);
    });
}

// Extracts file classes from a vue file in static class attributes and simple dynamic class bindings inside the template tag
function extractVueClasses(data, classes) {
    let tagContent = (data.match(/<template[^>]*>([\s\S]*?.*)<\/template>/s) || [])[0];

    if (!tagContent || tagContent.length == 0) return classes;

    const staticClassPattern = /\sclass\s*=\s*(["'])([\s\S]*?)\1/g;
    const boundClassPattern = /(?:\s:class|\sv-bind:class)\s*=\s*(["'])([\s\S]*?)\1/g;

    let match;

    while ((match = staticClassPattern.exec(tagContent))) {
        addClassTokens(match[2], classes);
    }

    while ((match = boundClassPattern.exec(tagContent))) {
        const value = match[2].trim();

        if (value.startsWith("{") && value.endsWith("}")) {
            extractObjectClassKeys(value.slice(1, -1), classes);
        } else if (value.startsWith("[") && value.endsWith("]")) {
            value.match(/['"`]([^'"`]+)['"`]/g)?.forEach((classValue) => {
                addClassTokens(classValue.slice(1, -1), classes);
            });
        } else {
            value.match(/['"`]([^'"`]+)['"`]/g)?.forEach((classValue) => {
                addClassTokens(classValue.slice(1, -1), classes);
            });
        }
    }

    return classes;
}

export { extractVueClasses };

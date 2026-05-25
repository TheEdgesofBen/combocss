function shouldIgnoreExtractedClass(className) {
    return !className || className.includes("${") || className.includes("}") || className.includes("`");
}

function addLiteralClasses(value, classes) {
    if (!value || value.includes("${")) return;

    value.split(/\s+/).forEach((className) => {
        if (!shouldIgnoreExtractedClass(className)) classes.add(className);
    });
}

function extractJSClasses(data, classes) {
    const patterns = [
        /(?:class|className)\s*=\s*["']([^"']+)["']/g,
        /["'`]([^"'`]*[A-Za-z][\w!:#()[\]%.\/-]+-[^"'`\s]+[^"'`]*)["'`]/g,
    ];

    patterns.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(data))) {
            addLiteralClasses(match[1], classes);
        }
    });

    return classes;
}

export { extractJSClasses };

function extractVueClasses(fileContent, classes) {
    let tagContent = fileContent.match(/<template>([\s\S]*?.*)<\/template>/s)[0];
    let classTags = "";
    let classValues = [];

    if (tagContent.length == 0) return;

    classTags = (tagContent.match(/class="([\s\S]*?)"/g) || []).join(" ");

    if (!classTags) return;

    classValues = classTags.match(/class="([\s\S]*?)"/g);

    classValues.forEach((classValue, classValueIndex) => {
        classValue = classValue.split('"')[1];

        if ((classValue.match(/{([\s\S]*?)}/g) || []).length > 0 && classValue.indexOf("{") == 0 && classValue.indexOf("}") == classValue.length - 1) {
            classValue = classValue.split("{")[1];
            classValue = classValue.split("}")[0];

            classValue.split(",").forEach((classObjProp) => {
                let classObjPropKey = classObjProp.trim().split(":")[0];

                if ((classObjPropKey.match(/'([\s\S]*?)'/g) || []).length > 0) {
                    classObjPropKey = classObjPropKey.split("'")[1];
                }

                if (classObjPropKey) classObjPropKey.match(/[^()\s]+(\(.*?\))?/g).forEach((classObjPropKeyPart) => classes.add(classObjPropKeyPart));
            });
        } else {
            if (classValue && (classValue.match(/'([\s\S]*?)'/g) || []).length == 0 && classValue.indexOf("'") != 0) {
                classValue.match(/[^()\s]+(\(.*?\))?/g).forEach((value) => {
                    classes.add(value);
                });
            }
        }
    });

    return classes;
}

module.exports = {
    extractVueClasses: extractVueClasses,
};

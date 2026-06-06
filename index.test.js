import assert from "node:assert/strict";
import test from "node:test";
import { combocss } from "./index.js";
import { getDeclarationParts, getClassParts, splitOutsideGroups } from "./lib/process.js";
import { extractRawFileClasses } from "./lib/extractors/index.js";

function normalize(css) {
    return css.replace(/\s+/g, " ").trim();
}

test("generates a basic utility class", async () => {
    const css = await combocss(["marginLeft-24px"]);

    assert.match(css, /\.marginLeft-24px/);
    assert.match(css, /margin-left: 24px/);
});

test("generates important and negative values", async () => {
    const css = await combocss(["!height-24px", "-marginTop-8px"]);

    assert.match(css, /height: 24px !important/);
    assert.match(css, /margin-top: -8px/);
});

test("generates value functions with spaces", async () => {
    const css = await combocss([
        "width-calc(100%_-_8px)",
        "maskImage-linearGradient(to_bottom,_black,_transparent_82%)",
        "border-1px-solid-var(--cyan)",
        "fontFamily-{Inter, system-ui, sans-serif}",
    ]);

    assert.match(css, /width: calc\(100% - 8px\)/);
    assert.match(css, /mask-image: linear-gradient\(to bottom, black, transparent 82%\)/);
    assert.match(css, /border: 1px solid var\(--cyan\)/);
    assert.match(css, /font-family: Inter, system-ui, sans-serif/);
    assert.doesNotMatch(css, /mask-image: linearGradient|mask-image: linear_gradient|border: .*solid-var/);
});

test("generates responsive classes", async () => {
    const css = await combocss(["tablet:height-32px"], { breakpoints: { tablet: "600px" } });

    assert.match(normalize(css), /@media \(min-width: 600px\)/);
    assert.match(css, /height: 32px/);
});

test("orders responsive classes from smallest to largest breakpoint", async () => {
    const css = await combocss(["wide:marginLeft-16px", "marginLeft-8px", "desktop:marginLeft-14px", "tablet:marginLeft-12px"], {
        breakpoints: {
            wide: "1440px",
            tablet: "700px",
            desktop: "1024px",
        },
    });

    const baseIndex = css.indexOf(".marginLeft-8px");
    const tabletIndex = css.indexOf("min-width: 700px");
    const desktopIndex = css.indexOf("min-width: 1024px");
    const wideIndex = css.indexOf("min-width: 1440px");

    assert(baseIndex > -1);
    assert(tabletIndex > baseIndex);
    assert(desktopIndex > tabletIndex);
    assert(wideIndex > desktopIndex);
});

test("generates custom combos and shortcuts", async () => {
    const css = await combocss(["button-primary", "ml-16px"], {
        custom: `
            .button-primary { @combo display-flex backgroundColor-red; }
            .ml { @shortcut marginLeft; }
        `,
    });

    assert.match(css, /display: flex/);
    assert.match(css, /background-color: red/);
    assert.match(css, /margin-left: 16px/);
});

test("safelisted classes resolve custom combos before generic utilities", async () => {
    const css = await combocss(["button-primary"], {
        custom: `.button-primary { @combo display-flex backgroundColor-red; }`,
    });

    assert.match(css, /\.button-primary\s*{/);
    assert.match(css, /display: flex/);
    assert.match(css, /background-color: red/);
    assert.doesNotMatch(css, /button-primary\s*{\s*button: primary/);
});

test("generates raw custom pseudo selectors when base class is used", async () => {
    const css = await combocss(["app-shell"], {
        custom: `
            .app-shell { @combo position-relative; }
            .app-shell:before { @combo content-'' position-absolute; }
        `,
    });

    assert.match(css, /\.app-shell\s*{/);
    assert.match(css, /\.app-shell:before\s*{/);
    assert.doesNotMatch(css, /app-shell\\:before:before/);
    assert.match(css, /content: ''/);
});

test("generates custom combo classes nested in media at-rules", async () => {
    const css = await combocss(["media-card"], {
        custom: `
            @media (min-width: 900px) {
                .media-card { @combo display-flex; }
            }
        `,
    });

    assert.match(css, /@media \(min-width: 900px\)/);
    assert.match(css, /\.media-card\s*{/);
    assert.match(css, /display: flex/);
});

test("generates top-level and media variants for the same custom combo class", async () => {
    const css = await combocss(["media-card"], {
        custom: `
            .media-card { @combo display-block; }
            @media (min-width: 900px) {
                .media-card { @combo display-flex; }
            }
        `,
    });

    assert.match(css, /\.media-card\s*{\n\s*display: block/);
    assert.match(css, /@media \(min-width: 900px\)\s*{\n\s*\.media-card\s*{\n\s*display: flex/);
});

test("generates utility pseudo classes when no custom selector exists", async () => {
    const css = await combocss(["marginLeft-8px:hover"]);

    assert.match(css, /\.marginLeft-8px\\:hover:hover/);
    assert.match(css, /margin-left: 8px/);
});

test("splits only outside groups", () => {
    assert.deepEqual(splitOutsideGroups("backgroundColor-rgba(1,2,3,0.5):hover", ":"), ["backgroundColor-rgba(1,2,3,0.5)", "hover"]);
    assert.deepEqual(splitOutsideGroups("width-calc(100%_-_8px)", "-"), ["width", "calc(100%_-_8px)"]);
});

test("parses class parts with pseudo selector groups", () => {
    assert.deepEqual(getClassParts("pc:backgroundColor-red:has(.test:hover)", { pc: "1440px" }), [["pc"], "backgroundColor-red:has(.test:hover)", []]);
});

test("parses declaration parts", () => {
    assert.deepEqual(getDeclarationParts("width-calc(100%_-_8px)"), ["width", "calc(100% - 8px)"]);
    assert.deepEqual(getDeclarationParts("backgroundColor-var(--color-primary)"), ["backgroundColor", "var(--color-primary)"]);
    assert.deepEqual(getDeclarationParts("maskImage-linearGradient(to_bottom,_black,_transparent_82%)"), ["maskImage", "linear-gradient(to bottom, black, transparent 82%)"]);
    assert.deepEqual(getDeclarationParts("border-1px-solid-var(--cyan)"), ["border", "1px", "solid", "var(--cyan)"]);
    assert.deepEqual(getDeclarationParts("fontFamily-{Inter, system-ui, sans-serif}"), ["fontFamily", "Inter, system-ui, sans-serif"]);
});

test("extracts Vue static and simple dynamic classes", () => {
    const classes = extractRawFileClasses(
        `<template>
            <div class="display-flex marginLeft-8px" :class="{ 'backgroundColor-red': active, textColor-blue: valid }"></div>
            <div :class="['height-24px', condition && 'width-32px']"></div>
            <div :class="[\`solar-shell-\${body.orbit}\`]"></div>
        </template>`,
        "vue",
        { prefix: [], suffix: [], class: [] }
    );

    assert(classes.has("display-flex"));
    assert(classes.has("marginLeft-8px"));
    assert(classes.has("backgroundColor-red"));
    assert(classes.has("textColor-blue"));
    assert(classes.has("height-24px"));
    assert(classes.has("width-32px"));
    assert(!classes.has("solar-shell-${body.orbit}"));
});

test("extracts JS/TS literal classes", () => {
    const classes = extractRawFileClasses(`const button = "display-flex marginLeft-8px"; <div className="height-24px" />`, "jsx", { prefix: [], suffix: [], class: [] });

    assert(classes.has("display-flex"));
    assert(classes.has("marginLeft-8px"));
    assert(classes.has("height-24px"));
});

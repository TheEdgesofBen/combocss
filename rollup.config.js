export default {
    input: "browser/index.js",
    output: [
        {
            file: "browser/browser.js",
            format: "module",
            sourcemap: true,
        },
    ],
    external: ["postcss", "autoprefixer", "stylelint", "fs", "path", "url", "fast-glob", "chokidar", "parse5"],
};

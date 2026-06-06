import fs from "fs";
import path from "path";

const defaultConfig = {
    input: ["index.html", "src/**/*.{vue,js,ts,jsx,tsx}"],
    output: "src/index.css",
    custom: ["custom.css"],
    classes: [],
    cache: ".combocss",
    strict: false,
    plugins: [],
    ignore: {
        prefix: [],
        suffix: [],
        class: [],
    },
    breakpoints: {
        tablet: "600px",
        tabletAndPC: "1024px",
        pc: "1440px",
        ultrawide: "1921px",
    },
};

function mergeConfig(base, override = {}) {
    return {
        ...base,
        ...override,
        ignore: {
            ...(base.ignore || {}),
            ...(override.ignore || {}),
        },
        breakpoints: {
            ...(base.breakpoints || {}),
            ...(override.breakpoints || {}),
        },
    };
}

function readConfigFile(configPath = "combo.config.json") {
    if (!fs.existsSync(configPath)) return {};

    const rawConfig = fs.readFileSync(configPath, "utf8");
    const trimmedConfig = rawConfig.trim();

    if (!trimmedConfig) return {};

    if (trimmedConfig.startsWith("{") || trimmedConfig.startsWith("[")) {
        return JSON.parse(trimmedConfig);
    }

    return { output: trimmedConfig };
}

function validateConfig(config) {
    const errors = [];

    if (!Array.isArray(config.input) && typeof config.input !== "string") errors.push("config.input must be a glob string or an array of glob strings");
    if (!config.output || typeof config.output !== "string") errors.push("config.output must be a file path string");
    if (!Array.isArray(config.custom) && typeof config.custom !== "string") errors.push("config.custom must be a glob string or an array of glob strings");

    ["prefix", "suffix", "class"].forEach((key) => {
        if (!Array.isArray(config.ignore?.[key])) errors.push(`config.ignore.${key} must be an array`);
    });

    if (errors.length > 0) {
        throw new Error(`Invalid ComboCSS config:\n- ${errors.join("\n- ")}`);
    }
}

function loadConfig(opts = {}) {
    const { configPath = "combo.config.json", ...inlineOptions } = opts || {};
    const fileConfig = readConfigFile(configPath);
    const config = mergeConfig(mergeConfig(defaultConfig, fileConfig), inlineOptions);

    validateConfig(config);

    config.input = Array.isArray(config.input) ? config.input : [config.input];
    config.custom = Array.isArray(config.custom) ? config.custom : [config.custom];
    config.classes = Array.isArray(config.classes) ? config.classes : [];
    config.plugins = Array.isArray(config.plugins) ? config.plugins : config.plugins === false ? [] : [config.plugins].filter(Boolean);
    config.cache = config.cache || ".combocss";
    config.store = path.join(config.cache, "store");
    config.configPath = configPath;

    return config;
}

export { defaultConfig, loadConfig, validateConfig };

#! /usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import plugin, { init } from "./plugin.js";
import { defaultConfig, loadConfig, validateConfig } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8"));

const cli = new Command();

cli.version(packageJson.version);

cli.command("init")
    .option("--force", "overwrite an existing combo.config.json")
    .action((options) => {
        const configPath = "combo.config.json";

        if (fs.existsSync(configPath) && !options.force) {
            console.error("combo.config.json already exists. Use --force to overwrite it.");
            process.exitCode = 1;
            return;
        }

        fs.writeFileSync(configPath, `${JSON.stringify(defaultConfig, null, 4)}\n`, "utf8");
        console.log("Created combo.config.json");
    });

cli.command("process")
    .option("--config <path>", "path to ComboCSS config", "combo.config.json")
    .action(async (options) => {
        await init({ configPath: options.config }, "cli");
    });

cli.command("watch")
    .option("--config <path>", "path to ComboCSS config", "combo.config.json")
    .action(async (options) => {
        plugin({ configPath: options.config }, "plugin");
    });

cli.command("validate")
    .option("--config <path>", "path to ComboCSS config", "combo.config.json")
    .action((options) => {
        const config = loadConfig({ configPath: options.config });
        validateConfig(config);
        console.log("ComboCSS config is valid");
    });

cli.command("clean")
    .option("--config <path>", "path to ComboCSS config", "combo.config.json")
    .action((options) => {
        const config = loadConfig({ configPath: options.config });

        if (fs.existsSync(config.cache)) {
            fs.rmSync(config.cache, { recursive: true, force: true });
            console.log(`Removed ${config.cache}`);
        } else console.log("ComboCSS cache is already clean");
    });

cli.parse(process.argv);

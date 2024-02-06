#! /usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import path from "path";
import plugin from "./plugin.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cli = new Command();

cli.version("0.5.1");

cli.command("init").action(() => {
    if (!fs.existsSync(path.resolve(__dirname, "./store"))) {
        fs.mkdirSync(path.resolve(__dirname, "./store"));
    }

    const config = fs.readFileSync(path.resolve(__dirname, "./defaultConfig.json"));

    fs.writeFileSync("combo.config.json", config, "utf8");
});

cli.command("process").action(() => {
    plugin({}, "cli");
});

cli.parse(process.argv);

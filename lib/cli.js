#! /usr/bin/env node

const { Command } = require("commander");
const fs = require("fs");
const path = require("path");
const cli = new Command();
const plugin = require("./plugin");

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

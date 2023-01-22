#! /usr/bin/env node

const { Command } = require("commander");
const fs = require("fs");
const path = require("path");
const cli = new Command();

cli.version("0.1.0");

cli.command("init").action(() => {
    const config = fs.readFileSync(path.resolve(__dirname, "./defaultConfig.json"));

    fs.writeFileSync("combo.config.json", config, "utf8");
});

cli.parse(process.argv);

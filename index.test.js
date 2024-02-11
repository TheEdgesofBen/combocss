import fs from "fs";

import { combocss } from "./browser/browser.js";

console.log(combocss);

async function runStandalone() {
    let standaloneOutput = await combocss(["marginLeft-24px"]);
    let testResult = `    
    .marginLeft-24px {
        margin-left: 24px
    }
    `;

    console.log(standaloneOutput, testResult);
}

async function runPlugin(output, opts = {}) {
    await plugin(opts);

    let res = await fs.readFileSync("./test/index.css", "utf-8");
}

async function test() {
    let expection = await fs.readFileSync("./test/expection.css", "utf-8");

    await runStandalone();
    //await runPlugin(expection);
}

test();

import fs from "fs";

import standalone from "./index.js";
import { plugin } from "./index.js";

async function runStandalone() {
    let standaloneOutput = await standalone(["marginLeft-24px"]);
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

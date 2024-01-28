const postcss = require("postcss");
const fs = require("fs");

const standalone = require("./index.js");
const { plugin } = require("./index.js");

async function runStandalone() {
    let standaloneOutput = await standalone(["marginLeft-24px"]);
    let testResult = `    
    .marginLeft-24px {
        margin-left: 24px
    }
    `;

    console.log(standaloneOutput);

    /*
    expect(standaloneOutput.length).toBeCloseTo(testResult.length);
    expect(standaloneOutput.warnings()).toHaveLength(0);
    */
}

async function runPlugin(output, opts = {}) {
    await plugin(opts);

    let res = await fs.readFileSync("./test/index.css", "utf-8");

    /*
    expect(res.length).toBeCloseTo(output.length);
    expect(res.warnings()).toHaveLength(0);
    */
}

it("does something", async () => {
    let expection = await fs.readFileSync("./test/expection.css", "utf-8");

    //console.log(expection);

    await runStandalone();
    await runPlugin(expection);
});

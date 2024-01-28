const postcss = require("postcss");
const fs = require("fs");

const standalone = require("./lib/standalone");
const plugin = require("./lib/plugin");

async function runStandalone() {
    let standaloneOutput = standalone(["marginLeft-24px"]);
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
    await postcss([plugin(opts)]).process("", {
        from: undefined,
    });

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

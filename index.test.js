const postcss = require("postcss");
const fs = require("fs");

const plugin = require("./");

async function run(output, opts = {}) {
    await postcss([plugin(opts)]).process("", {
        from: undefined,
    });

    let res = await fs.readFileSync("./test/index.css", "utf-8");

    expect(res.length).toBeCloseTo(output.length);
    expect(res.warnings()).toHaveLength(0);
}

it("does something", async () => {
    let expection = await fs.readFileSync("./test/expection.css", "utf-8");

    console.log(expection);

    await run(expection);
});

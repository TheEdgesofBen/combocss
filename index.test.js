const postcss = require("postcss");

const plugin = require("./");

async function run(input, output, opts = {}) {
    let result = await postcss([plugin(opts)]).process(input, {
        from: undefined,
    });

    expect(result.css).toEqual(output);
    expect(result.warnings()).toHaveLength(0);
}

it("does something", async () => {
    await run(
        "",
        `.fontSize-32px {
    font-size: 32px
}`,
        {
            input: ["test/index.html", "test/src/**/*.{vue,js,ts,jsx,tsx}"],
            output: ["test/index.css"],
            ignore: {
                prefix: ["pile-cards-", "fa ", "fa-", "we-", "leto-"],
                suffix: [],
                class: [],
            },
            breakpoints: {
                tablet: "600px",
                tabletAndPC: "1024px",
                pc: "1440px",
                ultrawide: "1921px",
            },
            custom: ["test/custom.css"],
        }
    );
});

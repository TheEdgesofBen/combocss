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
            input: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
            output: ["./index.css"],
            ignore: {
                prefix: ["pile-cards-", "fa ", "fa-", "we-", "leto-"],
                suffix: [],
                class: [],
            },
            defaults: {
                breakpoints: {
                    tablet: "600px",
                    tabletAndPC: "1024px",
                    pc: "1440px",
                    ultrawide: "1921px",
                },
                /*
            sizes: {
                "2xs": "8px",
                xs: "12px",
                sm: "16px",
                md: "24px",
                lg: "32px",
                xl: "48px",
                "2xl": "64px",
                default: "24px",
            },
            fonts: {
                sizes: {
                    "2xs": "10px",
                    xs: "12px",
                    sm: "14px",
                    md: "16px",
                    lg: "20px",
                    xl: "24x",
                    "2xl": "32px",
                    default: "16px",
                },
                weights: {
                    light: "300",
                    regoular: "400",
                    medium: "600",
                    bold: "700",
                    black: "800",
                },
                families: {
                    sans: ["Open Sans", "sans-serif"],
                    serif: ["Merriweather", "serif"],
                },
            },
            colors: {
                white: "#fdfdfd",
                grey: "#cccccc",
                black: "#333333",
                yellow: "#f2e76d",
                orange: "#f29655",
                red: "#f2616d",
                purple: "#c079f2",
                blue: "#6d83f2",
                mint: "#55f2cb",
                green: "#79f297",
            },
            defaultMargin: "8px",
            defaultPadding: "8px",
            */
            } /*
        themes: {
            dark: {},
        },*/,
            custom: {
                file: ["./custom.css"],
                classes: {
                    button: "padding-16px borderRadius-8px text-xl",
                    "mb-none": "marginBottom-none",
                },
                shortcut: {
                    bg: "background",
                    bgc: "backgroundColor",
                    bgi: "backgroundImage",
                    w: "width",
                    h: "height",
                    m: "margin",
                    mt: "marginTop",
                    ml: "marginLeft",
                    mr: "marginRight",
                    mb: "marginBottom",
                    pt: "paddingTop",
                    pl: "paddingLeft",
                    pr: "paddingRight",
                    pb: "paddingBottom",
                    z: "zIndex",
                },
            },
        }
    );
});

import { ColourTriple, Settings, Definitions } from "types";

function buildColourConversionFn(
    rgb_from_hsl: (h: number, s: number, l: number) => any
) {
    return (hsl: ColourTriple) => {
        function clamp(value: number, min: number, max: number) {
            return value < min ? min : value > max ? max : value;
        }

        function componentAsHexString(c: number) {
            let hex = c.toString(16);
            if (hex.length < 2) {
                hex = "0" + hex;
            }
            return hex;
        }

        const transportRGB = rgb_from_hsl(hsl[0], hsl[1], hsl[2]);
        let r = Math.floor(clamp(transportRGB.c0, 0, 1) * 255);
        let g = Math.floor(clamp(transportRGB.c1, 0, 1) * 255);
        let b = Math.floor(clamp(transportRGB.c2, 0, 1) * 255);

        return (
            "#" +
            componentAsHexString(r) +
            componentAsHexString(g) +
            componentAsHexString(b)
        );
    };
}

function augmentSettingsWithCssModifierParameters(uiColours: Settings) {
    let root = document.body;
    let mode = getComputedStyle(root).getPropertyValue("--mode").trim();

    let s;

    if (mode === "light") {
        s = {
            ...uiColours,

            hueDelta: 30,

            // used to generate the fg clock values
            hueOffsetFg: 67,
            saturationFg: 60,
            lightnessFg: 53.6,

            // used to generate the bg clock values
            hueOffsetBg: 67,
            saturationBg: 60,
            lightnessBg: 89.9,
        };
    } else {
        s = {
            ...uiColours,

            hueDelta: 30,

            // used to generate the fg clock values
            saturationBg: 60.5,
            hueOffsetBg: 67.1,
            lightnessBg: 30.0,

            // used to generate the bg clock values
            saturationFg: 57.6,
            hueOffsetFg: 65.7,
            lightnessFg: 60,
        };
    }
    return s;
}

function augmentDefinitionsWithCssModifierParameters(
    uiDefinitions: Definitions
) {
    let root = document.body;
    let mode = getComputedStyle(root).getPropertyValue("--mode").trim();

    let s;

    if (mode === "light") {
        // console.log("mode is light");
        let textSat = 83.7;
        let textLit = 53.6;
        s = {
            ...uiDefinitions,

            bg: [46.5, 19.2, 95.7] as ColourTriple,
            bg1: [85.7, 4.5, 93.9] as ColourTriple,
            bg2: [46.1, 20.2, 92.0] as ColourTriple,
            bg3: [0, 0.0, 100.0] as ColourTriple,

            fg: [43, 19, 3.5] as ColourTriple,
            fg1: [0, 0, 40.7] as ColourTriple,
            fg_inactive: [0, 0, 60] as ColourTriple,

            divider: [0, 0, 77.7] as ColourTriple,

            graph_node_expanded: [127, 60, 70] as ColourTriple,
            graph_node_partial: [37, 60, 70] as ColourTriple,
            graph_node_minimised: [0, 0, 70] as ColourTriple,
            graph_edge: [0, 0, 70] as ColourTriple,
            graph_edge_in_contrast: [217, 60, 70] as ColourTriple,
            graph_edge_critical: [7, 60, 70] as ColourTriple,

            scribble_neutral: [247, textSat, textLit] as ColourTriple,
            scribble_disagree: [15.1, textSat, textLit] as ColourTriple,
            hyperlink: [247, textSat, textLit] as ColourTriple,
            highlight: [85, 100, 90] as ColourTriple,

            bg_ideas: "--bg-clock-06",
            bg_articles: "--bg-clock-12",
            bg_people: "--bg-clock-09",
            bg_timelines: "--bg-clock-03",
            bg_quotes: "--bg-clock-07",

            fg_ideas: "--fg-clock-06",
            fg_articles: "--fg-clock-12",
            fg_people: "--fg-clock-09",
            fg_timelines: "--fg-clock-03",
            fg_quotes: "--fg-clock-07",

            red_text: [10, textSat, textLit] as ColourTriple,
            green_text: [130, textSat, textLit] as ColourTriple,
        };
    } else {
        // console.log("mode is dark");
        let textSat = 100;
        let textLit = 50;
        s = {
            ...uiDefinitions,

            bg: [46.5, 19.2, 2.0] as ColourTriple,
            bg1: [46.5, 19.2, 2.0] as ColourTriple,
            bg2: [46.5, 19.2, 2.0] as ColourTriple,
            bg3: [46.5, 19.2, 0.0] as ColourTriple,

            fg: [43, 19, 45] as ColourTriple,
            fg1: [16.7, 0, 40.7] as ColourTriple,
            fg_inactive: [16.7, 0, 20] as ColourTriple,

            divider: [46.5, 19.2, 2.0] as ColourTriple,

            graph_node_expanded: [127, 60, 70] as ColourTriple,
            graph_node_partial: [37, 60, 70] as ColourTriple,
            graph_node_minimised: [0, 0, 70] as ColourTriple,
            graph_edge: [0, 0, 70] as ColourTriple,
            graph_edge_in_contrast: [217, 60, 70] as ColourTriple,
            graph_edge_critical: [7, 60, 70] as ColourTriple,

            scribble_neutral: [247, textSat, textLit] as ColourTriple,
            scribble_disagree: [7, textSat, textLit] as ColourTriple,
            hyperlink: [247, textSat, textLit] as ColourTriple,
            highlight: [85, 100, 90] as ColourTriple,

            bg_ideas: "--bg-clock-06",
            bg_articles: "--bg-clock-12",
            bg_people: "--bg-clock-09",
            bg_timelines: "--bg-clock-03",
            bg_quotes: "--bg-clock-07",

            fg_ideas: "--fg-clock-06",
            fg_articles: "--fg-clock-12",
            fg_people: "--fg-clock-09",
            fg_timelines: "--fg-clock-03",
            fg_quotes: "--fg-clock-07",

            red_text: [10, textSat, textLit] as ColourTriple,
            green_text: [130, textSat, textLit] as ColourTriple,
        };
    }
    return s;
}

function declareCssVariables(
    uiColours: Settings,
    uiDefinitions: Definitions,
    rgbFromHsl: (hsl: ColourTriple) => any
) {
    let root = document.body;

    function cssFromUnderscore(name: string) {
        let cssName = "--" + name.replaceAll("_", "-");
        return cssName;
    }

    let hueFg: number, hueBg: number, rgb: string, index: string;
    for (let i = 0; i < 12; i++) {
        hueFg = uiColours.hueOffsetFg + i * uiColours.hueDelta;
        hueBg = uiColours.hueOffsetBg + i * uiColours.hueDelta;

        index = indexAsString(i);

        rgb = rgbFromHsl([
            hueFg,
            uiColours.saturationFg,
            uiColours.lightnessFg,
        ]);
        root.style.setProperty(`--fg-clock-${index}`, rgb);

        rgb = rgbFromHsl([
            hueBg,
            uiColours.saturationBg,
            uiColours.lightnessBg,
        ]);
        root.style.setProperty(`--bg-clock-${index}`, rgb);
    }

    Object.keys(uiDefinitions).forEach((key) => {
        let cssName = cssFromUnderscore(key);
        let value = uiDefinitions[key];

        if (Array.isArray(value)) {
            let hsl = value;
            let rgb = rgbFromHsl(hsl);
            root.style.setProperty(cssName, rgb);
        } else {
            let clockName = value;
            if (clockName) {
                let source = getComputedStyle(root).getPropertyValue(clockName);
                root.style.setProperty(cssName, source);
            }
        }
    });
}

function indexAsString(i: number) {
    if (i === 0) {
        return "12";
    } else if (i < 10) {
        return `0${i}`;
    } else {
        return `${i}`;
    }
}

export {
    buildColourConversionFn,
    declareCssVariables,
    augmentSettingsWithCssModifierParameters,
    augmentDefinitionsWithCssModifierParameters,
};

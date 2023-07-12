import {
    State,
    ColourScheme,
    ColourTriple,
    ColourSettings,
    ColourDefinitions,
} from "types";

function activateColourScheme(state: State, colourScheme: ColourScheme) {
    if (state.wasmInterface) {
        state.colourScheme = colourScheme;

        state.colourSettings.value = updateSettings(
            state.colourSettings.value,
            colourScheme
        );
        state.colourDefinitions.value = updateDefinitions(
            state.colourSettings.value,
            state.colourDefinitions.value,
            colourScheme
        );
        declareCssVariables(
            state.colourSettings.value,
            state.colourDefinitions.value,
            state.wasmInterface.rgbFromHsl
        );
    }
}

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

function updateSettings(
    uiColours: ColourSettings,
    colourScheme: ColourScheme
): ColourSettings {
    let s: ColourSettings;

    if (colourScheme === ColourScheme.Light) {
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

            textSat: 83.7,
            textLit: 53.6,
        };
    } else {
        s = {
            ...uiColours,

            hueDelta: 30,

            // used to generate the fg clock values
            hueOffsetBg: 67.1,
            saturationBg: 90.5,
            lightnessBg: 30.0,

            // used to generate the bg clock values
            hueOffsetFg: 65.7,
            saturationFg: 90.5,
            lightnessFg: 80,

            textSat: 100,
            textLit: 70,
        };
    }
    return s;
}

function updateDefinitions(
    uiColours: ColourSettings,
    uiDefinitions: ColourDefinitions,
    colourScheme: ColourScheme
): ColourDefinitions {

    // colours that can be derived from previously set
    // variables  regardless of the current colour scheme
    //
    let s: ColourDefinitions = {
        ...uiDefinitions,

        bg_ideas: "--bg-clock-06",
        bg_articles: "--bg-clock-12",
        bg_people: "--bg-clock-09",
        bg_timelines: "--bg-clock-03",
        bg_quotes: "--bg-clock-07",
        bg_dialogues: "--bg-clock-02",

        bg_stuff: "--bg-clock-11",

        fg_ideas: "--fg-clock-06",
        fg_articles: "--fg-clock-12",
        fg_people: "--fg-clock-09",
        fg_timelines: "--fg-clock-03",
        fg_quotes: "--fg-clock-07",
        fg_dialogues: "--fg-clock-02",

        fg_stuff: "--fg-clock-11",

        fg_toolbar_view: "--fg1",

        bg_memorise: [
            uiColours.hueDelta * 10 + uiColours.hueOffsetBg,
            uiColours.saturationBg - 30,
            uiColours.lightnessBg,
        ] as ColourTriple,
        bg_memorise_active: [
            uiColours.hueDelta * 10 + uiColours.hueOffsetBg,
            uiColours.saturationBg + 50,
            uiColours.lightnessBg,
        ] as ColourTriple,

        fg_memorise: [
            uiColours.hueDelta * 10 + uiColours.hueOffsetFg,
            uiColours.saturationFg - 30,
            uiColours.lightnessFg,
        ] as ColourTriple,
        fg_memorise_active: [
            uiColours.hueDelta * 10 + uiColours.hueOffsetFg,
            uiColours.saturationFg + 50,
            uiColours.lightnessFg,
        ] as ColourTriple,

        scribble_neutral: [247, uiColours.textSat, uiColours.textLit] as ColourTriple,
        scribble_disagree: [15.1, uiColours.textSat, uiColours.textLit] as ColourTriple,
        hyperlink: [247, uiColours.textSat, uiColours.textLit] as ColourTriple,
        highlight: [85, 100, 90] as ColourTriple,

        red_text: [10, uiColours.textSat, uiColours.textLit] as ColourTriple,
        green_text: [130, uiColours.textSat, uiColours.textLit] as ColourTriple,
    };

    // colours that need to be explicitly set for each colour scheme
    //
    if (colourScheme === ColourScheme.Light) {
        s = {
            ...s,

            bg0: [46.5, 19.2, 98.7] as ColourTriple,
            bg: [46.5, 19.2, 95.7] as ColourTriple,
            bg1: [46.1, 20.2, 88.0] as ColourTriple,

            fg: [43, 19, 3.5] as ColourTriple,
            fg1: [0, 0, 40.7] as ColourTriple,
            fg2: [0, 0, 70.7] as ColourTriple,

            fg_inactive: [0, 0, 60] as ColourTriple,

            bg_ui: [46.1, 20.2, 82.0] as ColourTriple,
            fg_ui: [46.1, 20.2, 62.0] as ColourTriple,

            divider: [0, 0, 77.7] as ColourTriple,

            graph_node_expanded: [127, 60, 70] as ColourTriple,
            graph_node_partial: [37, 60, 70] as ColourTriple,
            graph_node_minimised: [0, 0, 70] as ColourTriple,
            graph_edge: [0, 0, 70] as ColourTriple,
            graph_edge_in_contrast: [217, 60, 70] as ColourTriple,
            graph_edge_critical: [7, 60, 70] as ColourTriple,


            fg_toolbar_edit: [10, 80, 50] as ColourTriple,
            fg_toolbar_refs: [270, 80, 50] as ColourTriple,
            fg_toolbar_memorise: [170, 80, 50] as ColourTriple,
            fg_toolbar_add_above: [210, 80, 50] as ColourTriple,
            fg_toolbar_scratchlist: [70, 80, 50] as ColourTriple,
        };
    } else {
        s = {
            ...s,

            bg0: [230, 50, 0.0] as ColourTriple,
            bg: [230, 50, 20.0] as ColourTriple,
            bg1: [230, 50, 30.0] as ColourTriple,

            fg: [43, 19, 90] as ColourTriple,
            fg1: [16.7, 0, 80] as ColourTriple,
            fg2: [16.7, 0, 70] as ColourTriple,

            fg_inactive: [16.7, 0, 20] as ColourTriple,

            bg_ui: [46.1, 20.2, 2.0] as ColourTriple,
            fg_ui: [46.1, 20.2, 22.0] as ColourTriple,

            divider: [230, 50, 30.0] as ColourTriple,

            graph_node_expanded: [127, 60, 70] as ColourTriple,
            graph_node_partial: [37, 60, 70] as ColourTriple,
            graph_node_minimised: [0, 0, 70] as ColourTriple,
            graph_edge: [0, 0, 70] as ColourTriple,
            graph_edge_in_contrast: [217, 60, 70] as ColourTriple,
            graph_edge_critical: [7, 60, 70] as ColourTriple,

            fg_toolbar_edit: [10, 70, 50] as ColourTriple,
            fg_toolbar_refs: [270, 70, 50] as ColourTriple,
            fg_toolbar_memorise: [170, 100, 50] as ColourTriple,
            fg_toolbar_add_above: [210, 70, 50] as ColourTriple,
            fg_toolbar_scratchlist: [70, 70, 50] as ColourTriple,
        };
    }
    return s;
}

function declareCssVariables(
    uiColours: ColourSettings,
    uiDefinitions: ColourDefinitions,
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

export { activateColourScheme, buildColourConversionFn };

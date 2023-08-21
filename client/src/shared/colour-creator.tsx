import {
    State,
    ColourScheme,
    ColourTriple,
    ColourQuad,
    ColourSeeds,
} from "types";

type ColourDefinitions = {
    [index: string]: string | ColourTriple | ColourQuad | undefined;
};

function generateColoursFromSeeds(state: State, seeds: ColourSeeds) {
    if (state.wasmInterface) {
        const colourDefinitions: ColourDefinitions = generateColourDefs(seeds);
        const rgbFromHsl = state.wasmInterface.rgbFromHsl;

        function clamp(value: number, min: number, max: number) {
            return value < min ? min : value > max ? max : value;
        }

        function clampedRgbFromHsl(
            h: number,
            s: number,
            l: number
        ): [number, number, number] {
            const transportRGB = rgbFromHsl(h, s, l);

            let r = Math.floor(clamp(transportRGB.c0, 0, 1) * 255);
            let g = Math.floor(clamp(transportRGB.c1, 0, 1) * 255);
            let b = Math.floor(clamp(transportRGB.c2, 0, 1) * 255);

            return [r, g, b];
        }

        let root = document.body;

        Object.keys(colourDefinitions).forEach((key) => {
            let cssName = cssFromUnderscore(key);
            let value = colourDefinitions[key];

            if (Array.isArray(value)) {
                if (value.length === 3) {
                    let [h, s, l] = value as ColourTriple;

                    let [r, g, b] = clampedRgbFromHsl(h, s, l);
                    root.style.setProperty(cssName, `rgb(${r}, ${g}, ${b})`);
                } else if (value.length === 4) {
                    let [h, s, l, alpha] = value as ColourQuad;

                    let [r, g, b] = clampedRgbFromHsl(h, s, l);
                    root.style.setProperty(
                        cssName,
                        `rgba(${r}, ${g}, ${b}, ${alpha})`
                    );
                } else {
                    console.error(
                        `${cssName}: unknown array size expected 3 or 4`
                    );
                }
            } else {
                let name = value;
                if (name) {
                    let source = getComputedStyle(root).getPropertyValue(name);
                    root.style.setProperty(cssName, source);
                }
            }
        });
    }
}

function declareSeeds(colourScheme: ColourScheme): ColourSeeds {
    let s: ColourSeeds;

    if (colourScheme === ColourScheme.Light) {
        s = {
            uiFactor: 0.88,
            uiActiveFactor: 0.8,

            bgH: 46.5,
            bgS: 20.0,
            bgL: 99.0,
            bgLDelta: -3,

            fgH: 16.7,
            fgS: 0,
            fgL: 5.0,
            fgLDelta: 10.0,

            colouredTextS: 83.7,
            colouredTextL: 53.6,

            clockHDelta: 30,

            clockFgH: 67,
            clockFgS: 60,
            clockFgL: 53.6,

            clockBgH: 67,
            clockBgS: 60,
            clockBgL: 89.9,
        };
    } else {
        s = {
            uiFactor: 20.0,
            uiActiveFactor: 40.0,

            bgH: 230.0,
            bgS: 20.0,
            bgL: 1,
            bgLDelta: 3,

            fgH: 16.7,
            fgS: 0,
            fgL: 90.0,
            fgLDelta: -10.0,

            colouredTextS: 100,
            colouredTextL: 70,

            clockHDelta: 30,

            clockBgH: 67.1,
            clockBgS: 90.5,
            clockBgL: 30.0,

            clockFgH: 65.7,
            clockFgS: 90.5,
            clockFgL: 80,
        };
    }
    return s;
}

function generateColourDefs(seeds: ColourSeeds): ColourDefinitions {
    let defs: ColourDefinitions = {};

    for (let i = 0; i < 12; i++) {
        let hueFg = seeds.clockFgH + i * seeds.clockHDelta;
        let hueBg = seeds.clockBgH + i * seeds.clockHDelta;

        let index = indexAsString(i);

        defs[`fg_clock_${index}`] = [
            hueFg,
            seeds.clockFgS,
            seeds.clockFgL,
        ] as ColourTriple;
        defs[`bg_clock_${index}`] = [
            hueBg,
            seeds.clockBgS,
            seeds.clockBgL,
        ] as ColourTriple;
    }

    // colours that can be derived from previously set
    // variables regardless of the current colour scheme
    //
    defs = {
        ...defs,

        ui_control_highlight: [
            seeds.bgH,
            seeds.bgS,
            seeds.bgL * seeds.uiFactor,
            0.4,
        ] as ColourQuad,

        ui_control_shadow: [
            seeds.bgH,
            seeds.bgS,
            seeds.bgL * 0.2,
            0.1,
        ] as ColourQuad,

        ui_control_shadow_2: [
            seeds.bgH,
            seeds.bgS,
            seeds.bgL * 0.1,
            0.1,
        ] as ColourQuad,

        bg_ideas: "--bg-clock-06",
        bg_articles: "--bg-clock-12",
        bg_people: "--bg-clock-09",
        bg_timelines: "--bg-clock-01",
        bg_quotes: "--bg-clock-07",
        bg_dialogues: "--bg-clock-11",
        bg_events: "--bg-clock-03",

        fg_ideas: "--fg-clock-06",
        fg_articles: "--fg-clock-12",
        fg_people: "--fg-clock-09",
        fg_timelines: "--fg-clock-01",
        fg_quotes: "--fg-clock-07",
        fg_dialogues: "--fg-clock-11",
        fg_events: "--fg-clock-03",

        fg_toolbar_view: [
            seeds.fgH,
            seeds.fgS,
            seeds.fgL + seeds.fgLDelta * 1,
        ] as ColourTriple,

        scribble_neutral: [
            247,
            seeds.colouredTextS,
            seeds.colouredTextL,
        ] as ColourTriple,
        scribble_disagree: [
            15.1,
            seeds.colouredTextS,
            seeds.colouredTextL,
        ] as ColourTriple,
        hyperlink: [
            247,
            seeds.colouredTextS,
            seeds.colouredTextL,
        ] as ColourTriple,
        hyperlink_disabled: [
            247,
            seeds.colouredTextS * 0.5,
            seeds.colouredTextL,
        ] as ColourTriple,
        highlight: [85, 100, 90] as ColourTriple,

        red_text: [
            10,
            seeds.colouredTextS,
            seeds.colouredTextL,
        ] as ColourTriple,
        green_text: [
            130,
            seeds.colouredTextS,
            seeds.colouredTextL,
        ] as ColourTriple,

        fg_toolbar_edit: [10, 80, 50] as ColourTriple,
        fg_toolbar_refs: [270, 80, 50] as ColourTriple,
        fg_toolbar_memorise: [170, 80, 50] as ColourTriple,
        fg_toolbar_add_above: [210, 80, 50] as ColourTriple,
        fg_toolbar_bookmark: [70, 80, 50] as ColourTriple,

        graph_node_expanded: [127, 60, 70] as ColourTriple,
        graph_node_partial: [37, 60, 70] as ColourTriple,
        graph_node_minimised: [0, 0, 70] as ColourTriple,
        graph_edge: [0, 0, 70] as ColourTriple,
        graph_edge_in_contrast: [217, 60, 70] as ColourTriple,
        graph_edge_critical: [7, 60, 70] as ColourTriple,
    };

    defs = bgCol(defs, seeds, 1, "bg");
    defs = bgCol(defs, seeds, 0, "bg_lighter_1");
    defs = bgCol(defs, seeds, 2, "bg_darker_2");
    defs = bgCol(defs, seeds, 3, "bg_darker_3");
    defs = bgCol(defs, seeds, 4, "bg_darker_4");
    defs = bgCol(defs, seeds, 6, "bg_darker_6");

    defs = fgCol(defs, seeds, 0, "fg");
    defs = fgCol(defs, seeds, 1, "fg_lighter_1");
    defs = fgCol(defs, seeds, 2, "fg_lighter_2");
    defs = fgCol(defs, seeds, 5, "fg_lighter_5");
    defs = fgCol(defs, seeds, 7, "fg_lighter_7");

    defs = addTopMenuColours(defs, seeds, 150, "home");
    defs = addTopMenuColours(defs, seeds, 180, "seek");
    defs = addTopMenuColours(defs, seeds, 210, "insignias");
    defs = addTopMenuColours(defs, seeds, 300, "memorise");
    defs = addTopMenuColours(defs, seeds, 240, "stats");

    return defs;
}

function bgCol(
    defs: ColourDefinitions,
    seeds: ColourSeeds,
    factor: number,
    name: string
): ColourDefinitions {
    defs[name] = [
        seeds.bgH,
        seeds.bgS,
        seeds.bgL + seeds.bgLDelta * factor,
    ] as ColourTriple;

    return defs;
}

function fgCol(
    defs: ColourDefinitions,
    seeds: ColourSeeds,
    factor: number,
    name: string
): ColourDefinitions {
    defs[name] = [
        seeds.fgH,
        seeds.fgS,
        seeds.fgL + seeds.fgLDelta * factor,
    ] as ColourTriple;

    return defs;
}

function addTopMenuColours(
    defs: ColourDefinitions,
    seeds: ColourSeeds,
    factor: number,
    name: string
): ColourDefinitions {
    defs[`bg_${name}`] = [
        seeds.clockBgH + factor,
        seeds.clockBgS - 30,
        seeds.clockBgL,
    ] as ColourTriple;
    defs[`bg_${name}_active`] = [
        seeds.clockBgH + factor,
        seeds.clockBgS + 50,
        seeds.clockBgL,
    ] as ColourTriple;
    defs[`fg_${name}`] = [
        seeds.clockFgH + factor,
        seeds.clockFgS - 30,
        seeds.clockFgL,
    ] as ColourTriple;
    defs[`fg_${name}_active`] = [
        seeds.clockFgH + factor,
        seeds.clockFgS + 50,
        seeds.clockFgL,
    ] as ColourTriple;

    return defs;
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

function cssFromUnderscore(name: string) {
    let cssName = "--" + name.replaceAll("_", "-");
    return cssName;
}

export { generateColoursFromSeeds, declareSeeds };

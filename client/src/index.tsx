import { render } from "preact";
import "./index.css";

import { UiConfig, ColourScheme, UserWithUiConfig, UberSetup } from "./types";

import { basicUiConfig } from "./shared/ui-config";
import { getCssString, getCssBoolean } from "./shared/css";
import Net from "./shared/net";
import { App } from "./app";
import { AppStateChange, initialState } from "./app-state";

document.addEventListener("DOMContentLoaded", async function () {
    // note: wasm_bindgen is loaded from a civil_wasm.js script tag in index.html

    // initialise the wasm_bindgen
    //
    await wasm_bindgen();

    // grab the exports
    //
    const {
        civil_wasm_startup,
        markup_as_ast,
        markup_as_struct,
        rgb_from_hsl,
    } = wasm_bindgen;

    const version = civil_wasm_startup();
    console.log(version); // remove this

    const wasmInterface = {
        markupAsStruct: markup_as_struct,
        splitter: function (markup: string) {
            const astArray = markup_as_ast(markup);

            let splitPoints = astArray.map((ast: any) => {
                // NOTE: this check depends on the Node enum in civil-shared/src/parser.rs
                let node =
                    ast.BlockQuote ||
                    ast.Codeblock ||
                    ast.Header ||
                    ast.Highlight ||
                    ast.HorizontalRule ||
                    ast.Image ||
                    ast.ListItem ||
                    ast.MarginDisagree ||
                    ast.MarginScribble ||
                    ast.MarginText ||
                    ast.OrderedList ||
                    ast.Paragraph ||
                    ast.Quotation ||
                    ast.Strong ||
                    ast.Text ||
                    ast.Underlined ||
                    ast.UnorderedList ||
                    ast.Url;
                // The Rust enum Node in civil-shared stores the values in an array when
                // there is more than one data item attached (e.g. Image(usize, String)),
                // but as a single value if there is only one data item (e.g. HorizontalRule(usize))
                //
                return Array.isArray(node) ? node[0] : node;
            });

            let res: Array<string> = [];
            for (let i = 0; i < splitPoints.length - 1; i++) {
                const r = markup
                    .slice(splitPoints[i], splitPoints[i + 1])
                    .trim();
                res.push(r);
            }
            const r = markup.slice(splitPoints[splitPoints.length - 1]).trim();
            res.push(r);

            return res;
        },
        rgbFromHsl: rgb_from_hsl,
    };

    let state = initialState;

    state.wasmInterface = wasmInterface;
    state.hasPhysicalKeyboard = getCssBoolean("--has-physical-keyboard");
    state.canNarrowWidth = getCssBoolean("--can-narrow-width");

    let root = document.getElementById("root");
    if (root) {
        // assigning root to rootElement just to please the tsc compiler, it will
        // now know that rootElement cannot be null
        //
        const rootElement = root;

        const user = await Net.get<UserWithUiConfig>("/api/users");
        if (user) {
            // update initial state with user
            //
            state.user.value = {
                username: user.username,
                email: user.email,
                admin: user.admin,
            };

            // setup the UI Config:
            //
            setupUiConfig(user.uiConfigJson);

            // set title to highlight top menu bar items
            //
            let hrefParts = window.location.href.split("/");
            let title = hrefParts[hrefParts.length - 1];
            if (title === "") {
                title = "home";
            }
            AppStateChange.urlTitle({ title });

            // get the front-page user data
            //
            const uber = await Net.get<UberSetup>("/api/ubersetup");
            AppStateChange.uberSetup({ uber });
            render(<App state={state} />, rootElement);
        } else {
            // use system default theme from css variable "--mode"
            //
            let mode = getCssString("--mode");

            let uiConfig: UiConfig = basicUiConfig();
            uiConfig.colourScheme = colourSchemeFromString(mode);

            AppStateChange.setUiConfig({ uiConfig });

            render(<App state={state} />, rootElement);
        }
    }
});

function colourSchemeFromString(theme: string): ColourScheme {
    return theme === "light" ? ColourScheme.Light : ColourScheme.Dark;
}

function setupUiConfig(uiConfigJson: string) {
    // start with valid default values for the config
    let uiConfig: UiConfig = basicUiConfig();

    // customise defaults with values from the server
    // the server may not have all the values that are defined by UiConfig
    //
    let untypedConfig: any = JSON.parse(uiConfigJson);
    let configFromServer: UiConfig = JSON.parse(uiConfigJson);
    Object.keys(untypedConfig).forEach((key) => {
        if (key === "colourScheme") {
            uiConfig.colourScheme = configFromServer.colourScheme;
        }
        if (key === "decksPerPage") {
            uiConfig.decksPerPage = configFromServer.decksPerPage;
        }
    });
    AppStateChange.setUiConfig({ uiConfig });
}

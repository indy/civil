import { render, h } from "preact";
import "./index.css";

import { User, UberSetup } from "types";

import Net from "utils/net";
import { App } from "app";
import { AppStateChange, initialState } from "app-state";
import {
    augmentDefinitionsWithCssModifierParameters,
    augmentSettingsWithCssModifierParameters,
    buildColourConversionFn,
    declareCssVariables,
} from "utils/colour-creator";

wasm_bindgen("/civil_wasm_bg.wasm")
    .then(() => {
        const { init_wasm, markup_as_ast, markup_as_struct, rgb_from_hsl } =
            wasm_bindgen;

        const version = init_wasm();
        console.log(version); // remove this

        const wasmInterface = {
            markupAsStruct: markup_as_struct,
            splitter: function (markup: string) {
                const astArray = markup_as_ast(markup);

                let splitPoints = astArray.map((ast) => {
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
                const r = markup
                    .slice(splitPoints[splitPoints.length - 1])
                    .trim();
                res.push(r);

                return res;
            },
            rgbFromHsl: buildColourConversionFn(rgb_from_hsl),
        };

        let state = initialState;

        state.wasmInterface = wasmInterface;
        state.settings.value = augmentSettingsWithCssModifierParameters(
            state.settings.value
        );
        state.definitions.value = augmentDefinitionsWithCssModifierParameters(
            state.definitions.value
        );

        declareCssVariables(
            state.settings.value,
            state.definitions.value,
            wasmInterface.rgbFromHsl
        );

        let body = document.body;
        let hasPhysicalKeyboard = getComputedStyle(body)
            .getPropertyValue("--has-physical-keyboard")
            .trim();
        state.hasPhysicalKeyboard = hasPhysicalKeyboard === "true";

        Net.get<User>("/api/users").then((user) => {
            if (user) {
                // update initial state with user
                //
                state.user.value = user;

                Net.get<UberSetup>("/api/ubersetup").then((uber) => {
                    AppStateChange.uberSetup(uber);
                });
            }

            let root = document.getElementById("root");
            if (root) {
                render(<App state={state} />, root);
            }
        });
    })
    .catch(console.error);

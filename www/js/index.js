import { render } from '/lib/preact/mod.js';
import { initialState, sc_uberSetup } from '/js/AppState.js';
import Net from '/js/Net.js';
import { App } from '/js/App.js';
import { buildColourConversionFn, declareCssVariables, augmentSettingsWithCssModifierParameters } from '/js/ColourCreator.js';

wasm_bindgen('/civil_wasm_bg.wasm')
    .then(async wasm_bg => {
        const { init_wasm, markup_as_ast, markup_as_struct, rgb_from_hsl } = wasm_bindgen;
        const version = init_wasm();

        const wasmInterface = {
            asHtmlAst: markup_as_struct,
            splitter: function(markup) {
                const astArray = markup_as_ast(markup);

                let splitPoints = astArray.map(ast => {
                    // NOTE: this check depends on the Node enum in civil-shared/src/parser.rs
                    let node = ast.BlockQuote ||
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
                })

                let res = [];
                for (let i = 0; i < splitPoints.length - 1; i++) {
                    const r = markup.slice(splitPoints[i], splitPoints[i+1]).trim();
                    res.push(r);
                }
                const r = markup.slice(splitPoints[splitPoints.length - 1]).trim();
                res.push(r);

                return res;
            },
            rgbFromHsl: buildColourConversionFn(rgb_from_hsl)
        };

        let state = initialState;

        state.wasmInterface = wasmInterface;
        state.uiColours = augmentSettingsWithCssModifierParameters(state.uiColours);
        declareCssVariables(state.uiColours, wasmInterface.rgbFromHsl);

        let root = document.body;
        let hasPhysicalKeyboard = getComputedStyle(root).getPropertyValue("--has-physical-keyboard").trim();
        state.hasPhysicalKeyboard = hasPhysicalKeyboard === "true";

        Net.get("/api/users").then(user => {
            if (user) {
                // update initial state with user
                //
                state.user.value = user;

                Net.get("/api/ubersetup").then(uber => {
                    sc_uberSetup(state, uber);
                });
            }
            render(App(state), document.getElementById('root'));
        });
    })
    .catch(console.error);

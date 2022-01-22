import { render } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { App, buildInitialState } from '/js/App.js';
import { buildColourConversionFn, declareCssVariables } from '/js/ColourCreator.js';

wasm_bindgen('/civil_wasm_bg.wasm')
  .then(async wasm_bg => {

    const { init_wasm, markup_as_struct, split_markup, rgb_from_hsl } = wasm_bindgen;

    const version = init_wasm();
    // console.log(version);

    const wasmInterface = {
      asHtmlAst: markup_as_struct,
      splitter: split_markup,
      rgbFromHsl: buildColourConversionFn(rgb_from_hsl)
    };

    const state = await buildInitialState();

    declareCssVariables(state.uiColours, wasmInterface.rgbFromHsl);

    render(App(state, wasmInterface), document.getElementById('root'));
  })
  .catch(console.error);

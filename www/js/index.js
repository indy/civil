import { render } from '/lib/preact/mod.js';
import Net from '/js/Net.js';
import { App, buildInitialState } from '/js/App.js';

wasm_bindgen('/wasm_bg.wasm')
  .then(async wasm_bg => {

    const { init_wasm, markup_as_struct, split_markup, graph_physics } = wasm_bindgen;

    const version = init_wasm();
    // console.log(version);

    const wasmInterface = {
      asHtmlAst: markup_as_struct,
      splitter: split_markup,
      graphPhysics: graph_physics
    };

    const state = await buildInitialState();

    render(App(state, wasmInterface), document.getElementById('root'));
  })
  .catch(console.error);

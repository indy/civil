import { render } from '/lib/preact/mod.js';
import Net from '/js/Net.js';
import { App, buildInitialState } from '/js/App.js';

wasm_bindgen('/wasm_bg.wasm')
  .then(async wasm_bg => {

    const { init_wasm, markup_as_struct, markup_splitter, graph_physics } = wasm_bindgen;

    init_wasm();

    const wasmInterface = {
      asHtmlAst: markup_as_struct,
      splitter: markup_splitter,
      graphPhysics: graph_physics
    };

    const state = await buildInitialState();

    render(App(state, wasmInterface), document.getElementById('root'));
  })
  .catch(console.error);

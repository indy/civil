import { render } from '/lib/preact/mod.js';
import Net from '/js/Net.js';
import App from '/js/App.js';


wasm_bindgen('/wasm_bg.wasm')
  .then(wasm_bg => {

    const { init_wasm, markup_as_struct, markup_splitter, graph_physics } = wasm_bindgen;

    init_wasm();

    const wasmInterface = {
      asHtmlAst: markup_as_struct,
      splitter: markup_splitter,
      graphPhysics: graph_physics
    };

    Net.get("/api/users").then(user => {
      // this is _really_ not good - 5 trips to the server before a logged in user's page begins rendering
      Net.get("/api/upload/directory").then(imageDirectory => {
        Net.get("/api/upload").then(recentImages => {
          Net.get("/api/autocomplete").then(autocompleteDecks => {
            Net.get("/api/cmd/graph").then(graphResponse => {
              const graphConnections = graphResponse.results;
              render(App({ wasmInterface,
                           autocompleteDecks,
                           graphConnections,
                           imageDirectory,
                           recentImages,
                           user}),
                     document.getElementById('root'));
            });
          });
        });
      });

    }, err => {
      render(App({ wasmInterface }), document.getElementById("root"));
    });
  })
  .catch(console.error);

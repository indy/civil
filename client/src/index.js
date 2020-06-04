/*global wasm_bindgen*/

import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import Net from './lib/Net';

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
      // this is not good - 3 trips to the server before a logged in user's page begins rendering
      Net.get("/api/autocomplete").then(autocompleteDecks => {
        Net.get("/api/cmd/graph").then(graphResponse => {
          ReactDOM.render(<App wasmInterface={ wasmInterface }
                               autocompleteDecks={ autocompleteDecks }
                               graphConnections={ graphResponse.results }
                               user={ user }/>,
                          document.getElementById('root'));

        });
      });
    }, err => {
      ReactDOM.render(<App wasmInterface={ wasmInterface }/>,
                      document.getElementById('root'));
    });
  })
  .catch(console.error);


registerServiceWorker();

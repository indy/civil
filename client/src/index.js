/*global wasm_bindgen*/

import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import Net from './lib/Net';

wasm_bindgen('/wasm_bg.wasm')
  .then(wasm_bg => {

    const { markup_as_struct, markup_splitter } = wasm_bindgen;
    const markup = {
      asHtmlAst: markup_as_struct,
      splitter: markup_splitter
    };

    Net.get("/api/users").then(user => {
      ReactDOM.render(<App markup={ markup }
                           user={ user }/>,
                      document.getElementById('root'));
    }, err => {
      ReactDOM.render(<App markup={ markup }/>,
                      document.getElementById('root'));
    });
  })
  .catch(console.error);


registerServiceWorker();

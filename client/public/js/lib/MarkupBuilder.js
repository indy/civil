import { h } from '/js/ext/preact.module.js';

import { useWasmInterface } from '/js/lib/WasmInterfaceProvider.js';

// build the React structure from the AST generated by rust
//
export function buildMarkup(content) {
  const wasmInterface = useWasmInterface();
  const astArray = wasmInterface.asHtmlAst(content);

  return astArray.map(compile);
}

function compile(n) {
  return n.name === "text" ? n.text : h(n.name, attrs(n), ...n.children.map(compile));
}

function attrs(n) {
  return {
    key: n.key,
    class: n.class_name,
    for: n.html_for,
    href: n.href,
    type: n.html_type,
    id: n.id
  }
}

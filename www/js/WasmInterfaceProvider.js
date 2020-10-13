import { html, createContext, useContext } from '/lib/preact/mod.js';

export const WasmInterfaceContext = createContext();

export const WasmInterfaceProvider = ({wasmInterface, children}) => {
  return html`
    <${WasmInterfaceContext.Provider} value=${wasmInterface}>
      ${children}
    </${WasmInterfaceContext.Provider}>`;
};

export const useWasmInterface = () => useContext(WasmInterfaceContext);

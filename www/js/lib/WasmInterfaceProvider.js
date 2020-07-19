import { h, createContext } from '/js/ext/preact.module.js';
import { useContext } from '/js/ext/hooks.module.js';
import htm from '/js/ext/htm.js';

export const WasmInterfaceContext = createContext();

export const WasmInterfaceProvider = ({wasmInterface, children}) => {
  const html = htm.bind(h);

  return html`
    <${WasmInterfaceContext.Provider} value=${wasmInterface}>
      ${children}
    </${WasmInterfaceContext.Provider}>
`;
};

export const useWasmInterface = () => useContext(WasmInterfaceContext);

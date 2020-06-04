import React, {createContext, useContext } from 'react';

export const WasmInterfaceContext = createContext();

export const WasmInterfaceProvider = ({wasmInterface, children}) =>(
  <WasmInterfaceContext.Provider value={ wasmInterface }>
    {children}
  </WasmInterfaceContext.Provider>
);

export const useWasmInterface = () => useContext(WasmInterfaceContext);

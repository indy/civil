import React, {createContext, useContext } from 'react';

export const MarkupContext = createContext();

export const MarkupProvider = ({markup, children}) =>(
  <MarkupContext.Provider value={ markup }>
    {children}
  </MarkupContext.Provider>
);

export const useMarkupValue = () => useContext(MarkupContext);

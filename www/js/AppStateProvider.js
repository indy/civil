import { html, createContext, useContext } from '/lib/preact/mod.js';

export const AppStateContext = createContext();

export const AppStateProvider = ({state, children}) => {
    return html`
        <${AppStateContext.Provider} value=${state}>
            ${children}
        </${AppStateContext.Provider}>`;
};

export const getAppState = () => useContext(AppStateContext);

import { html, createContext, useContext } from '/lib/preact/mod.js';

export const StateContext = createContext();

export const StateProvider = ({state, children}) => {
    return html`
        <${StateContext.Provider} value=${state}>
            ${children}
        </${StateContext.Provider}>`;
};

export const useStateValue = () => useContext(StateContext);

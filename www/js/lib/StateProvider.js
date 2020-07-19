import { html, createContext, useContext, useReducer } from '/js/ext/library.js';

export const StateContext = createContext();

export const StateProvider = ({reducer, initialState, children}) => {
  return html`
    <${StateContext.Provider} value=${useReducer(reducer, initialState)}>
      ${children}
    </${StateContext.Provider}>
`;
};

export const useStateValue = () => useContext(StateContext);

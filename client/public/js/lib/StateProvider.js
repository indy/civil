import { h, createContext } from '/js/ext/preact.module.js';
import { useContext, useReducer } from '/js/ext/hooks.module.js';
import htm from '/js/ext/htm.module.js';

export const StateContext = createContext();

export const StateProvider = ({reducer, initialState, children}) => {
  const html = htm.bind(h);

  return html`
    <${StateContext.Provider} value=${useReducer(reducer, initialState)}>
      ${children}
    </${StateContext.Provider}>
`;
};

export const useStateValue = () => useContext(StateContext);

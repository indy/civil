import { useReducer } from '/lib/preact/mod.js';

// a thin wrapper around preact's useReducer, the only difference is
// that the returned dispatch function takes 2 arguments: type and data
// and that the reducer receives an object { type, data }
//
export function useLocalReducer(reducer, initialState) {
  const [state, preactDispatch] = useReducer(reducer, initialState);

  function dispatch(type, data) {
    preactDispatch({ type, data });
  }

  return [state, dispatch];
}

import { useReducer } from "preact/hooks";

// a thin wrapper around preact's useReducer, the only difference is
// that the returned dispatch function takes 2 arguments: type and data
// and that the reducer receives an object { type, data }
//
export default function useLocalReducer(reducer: any, initialState: any) {
    const [state, preactDispatch] = useReducer(reducer, initialState);

    function dispatch(type, data) {
        preactDispatch({ type, data });
    }

    return [state, dispatch];
}

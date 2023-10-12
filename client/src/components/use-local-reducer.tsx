import { type Reducer, useReducer } from "preact/hooks";

// a thin wrapper around preact's useReducer, the only difference is
// that the returned dispatch function takes 2 arguments: type and data
// and that the reducer receives an object { type, data }
//
export default function useLocalReducer<S, AT>(
    reducer: Reducer<S, any>,
    initialState: S,
): [S, (actionType: AT, data?: any) => void] {
    const [state, preactDispatch] = useReducer<S, any>(reducer, initialState);

    function dispatch(type: AT, data: any): void {
        preactDispatch({ type, data });
    }

    return [state, dispatch];
}

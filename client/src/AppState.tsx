import { h, createContext, ComponentChildren } from "preact";
import { signal } from "@preact/signals";
import { useContext } from "preact/hooks";

import { IUser, IUberSetup, IState, ToolbarMode } from "./types";

const emptyUser: IUser = {
    username: "",
    email: "",
    admin: { dbName: "" },
};

const state: IState = {
    appName: "civil",
    toolbarMode: signal(ToolbarMode.Fake),
    wasmInterface: undefined,

    settings: signal({
        hueDelta: 30,

        hueOffsetFg: 0,
        saturationFg: 0,
        lightnessFg: 0,

        hueOffsetBg: 0,
        saturationBg: 0,
        lightnessBg: 0,
    }),
    definitions: signal({}),

    hasPhysicalKeyboard: true,

    user: signal(emptyUser),
};

export const initialState = state;

export const AppStateContext = createContext(state);

export const AppStateProvider = ({
    state,
    children,
}: {
    state: IState;
    children: ComponentChildren;
}) => {
    return (
        <AppStateContext.Provider value={state}>
            {children}
        </AppStateContext.Provider>
    );
};

export const getAppState = () => useContext(AppStateContext);

const DEBUG_APP_STATE = false;

export const AppStateChange = {
    uberSetup: function (uber: IUberSetup) {
        if (DEBUG_APP_STATE) {
            console.log("uberSetup");
        }

        console.log(uber);
    },
    userLogin: function () {
        if (DEBUG_APP_STATE) {
            console.log("userLogin");
        }
    },
    userLogout: function () {
        if (DEBUG_APP_STATE) {
            console.log("userLogout");
        }
    },
};

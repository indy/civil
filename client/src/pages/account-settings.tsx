import { h, ComponentChildren } from "preact";
import { route } from "preact-router";
import { useEffect, useState } from "preact/hooks";

import { ColourScheme } from "types";

import { getAppState, AppStateChange } from "app-state";

import Net from "utils/net";
import { activateColourScheme } from "utils/colour-creator";

import Module from "components/module";

import { svgSun, svgMoon } from "components/svg-icons";

export default function AccountSettings({ path }: { path?: string }) {
    return (
        <article>
            <TestModule />
            <ColourSchemeSelector />
            <Logout />
        </article>
    );
}

function TestModule({}) {
    if (true) {
        return <div></div>;
    }
    return <Module heading="test module">
        <h2 class="pigment-ideas">Ideas</h2>
        <h2 class="pigment-articles">Articles</h2>
        <h2 class="pigment-people">People</h2>
        <h2 class="pigment-timelines">Timelines</h2>
        <h2 class="pigment-quotes">Quotes</h2>
        <h2 class="pigment-dialogues">Dialogues</h2>
        <h2 class="pigment-stuff">Stuff</h2>
        <h2 class="pigment-sr">SR</h2>
        </Module>

}

function Logout({}) {
    const handleLogout = (event: Event) => {
        Net.delete("api/auth", {}).then(() => {
            //// this isn't logging out the user, refreshing the app logs the user back in
            AppStateChange.userLogout();
            route("/login", true);
        });
        event.preventDefault();
    };

    return (
        <Module heading="peace out">
            <form onSubmit={handleLogout}>
                <input type="submit" value="Log out " />
            </form>
        </Module>
    );
}

function ColourSchemeSelector({}) {
    const appState = getAppState();

    const [colourScheme, setColourScheme] = useState(appState.colourScheme);

    useEffect(() => {
        activateColourScheme(appState, colourScheme);
    }, [colourScheme]);

    return (
        <Module heading="colour scheme">
            <div class="icon-horizontal-grouping">
                <ColourSchemeOption
                    desiredScheme={ColourScheme.Light}
                    colourScheme={colourScheme}
                    setColourScheme={setColourScheme}
                >
                    {svgSun()}
                </ColourSchemeOption>
                <ColourSchemeOption
                    desiredScheme={ColourScheme.Dark}
                    colourScheme={colourScheme}
                    setColourScheme={setColourScheme}
                >
                    {svgMoon()}
                </ColourSchemeOption>
            </div>
        </Module>
    );
}

type ColourSchemeOptionProps = {
    desiredScheme: ColourScheme;
    colourScheme: ColourScheme;
    setColourScheme: (cs: ColourScheme) => void;
    children: ComponentChildren;
};

function ColourSchemeOption({
    desiredScheme,
    colourScheme,
    setColourScheme,
    children,
}: ColourSchemeOptionProps) {
    function clickHandler() {
        if (colourScheme !== desiredScheme) {
            setColourScheme(desiredScheme);
        }
    }

    let cl = "icon-button ";
    cl += colourScheme === desiredScheme ? "icon-selected" : "icon-unselected";

    return (
        <div class={cl} onClick={clickHandler}>
            {children}
        </div>
    );
}

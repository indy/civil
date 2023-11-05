import { type ComponentChildren } from "preact";
import { route } from "preact-router";

import { AppStateChange } from "../app-state";

import Net from "../shared/net";

import { CivContainer, CivMainUi } from "./civil-layout";

export default function AccountSettings({ path }: { path?: string }) {
    return (
        <article>
            <Logout />
        </article>
    );
}

function Logout({}) {
    const handleLogout = (event: Event) => {
        Net.delete("api/auth", {}).then(() => {
            //// this isn't logging out the user, refreshing the app logs the user back in
            AppStateChange.userLogout({});
            route("/login", true);
        });
        event.preventDefault();
    };

    return (
        <Module heading="peace out">
            <form onSubmit={handleLogout}>
                <input class="c-civil-button" type="submit" value="Log out " />
            </form>
        </Module>
    );
}
type Props = {
    heading: string;
    buttons?: ComponentChildren;
    children: ComponentChildren;
};

function Module({ heading, children, buttons }: Props) {
    return (
        <article class="module">
            <CivContainer>
                <CivMainUi>
                    <span class="module-top-part">
                        <span class="display-flex-justify-right">
                            {buttons}
                        </span>
                        <h1 class="ui">{heading}</h1>
                    </span>
                    {children}
                </CivMainUi>
            </CivContainer>
        </article>
    );
}

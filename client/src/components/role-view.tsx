import { h } from "preact";

import { Font, RenderingDeckPart, Role } from "types";

import { fontClass } from "utils/civil";

import { getAppState } from "app-state";

type Props = {
    role: Role;
};

function roleToString(role: Role, username: string): string {
    switch (role) {
        case Role.System:
            return "system";
        case Role.Assistant:
            return "assistant";
        case Role.User:
            return username;
    }
}

function roleFont(role: Role): Font {
    switch (role) {
        case Role.System:
            return Font.Serif;
        case Role.Assistant:
            return Font.AI;
        case Role.User:
            return Font.Cursive;
    }
}

export default function RoleView({ role }: Props) {
    const appState = getAppState();

    const font = roleFont(role);
    let classes = fontClass(font, RenderingDeckPart.UiInterleaved);
    classes += " role-view";

    return (
        <div class={classes}>
            {roleToString(role, appState.user.value.username)}
        </div>
    );
}

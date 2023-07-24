import { h } from "preact";

import { RenderingDeckPart, Role } from "types";

import { typefaceClass } from "utils/civil";

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

function roleTypeface(role: Role): string {
    switch (role) {
        case Role.System:
            return "serif";
        case Role.Assistant:
            return "ai";
        case Role.User:
            return "cursive";
    }
}

export default function RoleView({ role }: Props) {
    const appState = getAppState();

    const typeface = roleTypeface(role);
    let classes = typefaceClass(typeface, RenderingDeckPart.UiInterleaved);
    classes += " role-view";

    return (
        <div class={classes}>
            {roleToString(role, appState.user.value.username)}
        </div>
    );
}

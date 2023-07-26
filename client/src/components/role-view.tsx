import { h } from "preact";

import { RenderingDeckPart, Role } from "types";

import { fontClass, fontForRole } from "utils/civil";

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

export default function RoleView({ role }: Props) {
    const appState = getAppState();

    const font = fontForRole(role);
    let classes = fontClass(font, RenderingDeckPart.UiInterleaved);
    classes += " role-view";

    return (
        <div class={classes}>
            {roleToString(role, appState.user.value.username)}
        </div>
    );
}

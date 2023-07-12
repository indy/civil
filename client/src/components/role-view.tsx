import { h } from "preact";

import { Role } from "types";

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

    let classes = "role-view";
    if (role === Role.Assistant) {
        // hack in here because the assistant uses a monospaced font which is smaller than the default font
        // so the "Assistant" text in the left margin is slightly too low
        // this hack shifts the "Assistant" text up slightly
        //
        classes += " role-view-assistant-hack";
    }

    return (
        <div class={classes}>
            {roleToString(role, appState.user.value.username)}
        </div>
    );
}

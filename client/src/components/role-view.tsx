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

    return (
        <div class="role-view">
            {roleToString(role, appState.user.value.username)}
        </div>
    );
}

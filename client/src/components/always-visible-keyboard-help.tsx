import { type ComponentChildren } from "preact";

import WhenPhysicalKeyboard from "./when-physical-keyboard";

export default function AlwaysVisibleKeyboardHelp({
    children,
}: {
    children: ComponentChildren;
}) {
    return (
        <WhenPhysicalKeyboard>
            <div class="modal-keyboard-help">{children}</div>
        </WhenPhysicalKeyboard>
    );
}

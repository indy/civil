import { ComponentChildren, h } from "preact";

import WhenPhysicalKeyboard from "components/when-physical-keyboard";

export default function ModalKeyboardHelp({
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

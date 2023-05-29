import { h, ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import {
    svgChevronDoubleDown,
    svgChevronDoubleRight,
} from "components/svg-icons";

type Props = {
    heading: string;
    children: ComponentChildren;
    initiallyRolledUp?: boolean;
};

export default function RollableSegment({
    heading,
    children,
    initiallyRolledUp,
}: Props) {
    let [isRolledUp, setIsRolledUp] = useState(!!initiallyRolledUp);

    function onRollClicked(e: Event) {
        e.preventDefault();
        setIsRolledUp(!isRolledUp);
    }

    let classState = isRolledUp ? "rolled-up" : "rolled-down";
    let icon = isRolledUp ? svgChevronDoubleRight() : svgChevronDoubleDown();

    return (
        <section class={classState}>
            <div class="muh-container">
                <div class="left-margin">
                    <div
                        class="left-margin-entry-no-note-on-right clickable"
                        onClick={onRollClicked}
                    >
                        {icon}
                    </div>
                </div>
                <div class="muh-content">
                <h2 class="clickable ui" onClick={onRollClicked}>
                    {heading}
                </h2>
                <hr class="big-segment" />
                {!isRolledUp && children}
                </div>
            </div>
        </section>
    );
}

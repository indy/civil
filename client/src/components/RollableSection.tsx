import { h, ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import { svgChevronDoubleDown, svgChevronDoubleRight } from "../svgIcons";

export default function RollableSection({
    heading,
    children,
    initiallyRolledUp,
}: {
    heading?: any;
    children: ComponentChildren;
    initiallyRolledUp?: any;
}) {
    let [isRolledUp, setIsRolledUp] = useState(!!initiallyRolledUp);

    function onRollClicked(e: Event) {
        e.preventDefault();
        setIsRolledUp(!isRolledUp);
    }

    let classState = isRolledUp ? "rolled-up" : "rolled-down";
    let icon = isRolledUp ? svgChevronDoubleRight() : svgChevronDoubleDown();

    return (
        <section class={classState}>
            <div>
                <div class="left-margin">
                    <div
                        class="left-margin-entry-no-note-on-right clickable"
                        onClick={onRollClicked}
                    >
                        {icon}
                    </div>
                </div>
                <h2 class="clickable ui" onClick={onRollClicked}>
                    {heading}
                </h2>
                <hr class="big-section" />
                {!isRolledUp && children}
            </div>
        </section>
    );
}

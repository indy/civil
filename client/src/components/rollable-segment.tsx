import { h, ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import { CivContainer, CivMain, CivLeft } from "components/civil-layout";

import {
    svgChevronDoubleDown,
    svgChevronDoubleRight,
} from "components/svg-icons";

// interleaved: is the segment going to be part of a deck?
// (as opposed to being a part of the ui, e.g. on the front page)
//
type Props = {
    heading: string;
    children: ComponentChildren;
    initiallyRolledUp?: boolean;
    invisible?: boolean;
    interleaved?: boolean;
};

export default function RollableSegment({
    heading,
    children,
    initiallyRolledUp,
    invisible,
    interleaved,
}: Props) {
    let [isRolledUp, setIsRolledUp] = useState(!!initiallyRolledUp);

    function onRollClicked(e: Event) {
        e.preventDefault();
        setIsRolledUp(!isRolledUp);
    }

    let classState = isRolledUp ? "rolled-up" : "rolled-down";
    if (invisible) {
        classState += " invisible";
    }

    let headingClass = "clickable ";
    headingClass += interleaved ? "interleaved" : "ui";

    let icon = isRolledUp ? svgChevronDoubleRight() : svgChevronDoubleDown();
    return (
        <section class={classState}>
            <CivContainer>
                <CivLeft ui>
                    <div class="clickable" onClick={onRollClicked}>
                        {icon}
                    </div>
                </CivLeft>
                <CivMain>
                    <h2 class={headingClass} onClick={onRollClicked}>
                        {heading}
                    </h2>
                    <hr class="big-segment" />
                </CivMain>
            </CivContainer>
            {!isRolledUp && children}
        </section>
    );
}

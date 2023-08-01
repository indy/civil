import { h, ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import { Font, RenderingDeckPart } from "types";

import { fontClass } from "shared/font";

import { CivContainer, CivMain, CivLeft } from "components/civil-layout";

import {
    svgChevronDoubleDown,
    svgChevronDoubleRight,
} from "components/svg-icons";

// (as opposed to being a part of the ui, e.g. on the front page)
//
type Props = {
    heading: string;
    font: Font;
    buttons?: ComponentChildren;
    children: ComponentChildren;
    initiallyRolledUp?: boolean;
    invisible?: boolean;
};

export default function RollableSegment({
    heading,
    font,
    buttons,
    children,
    initiallyRolledUp,
    invisible,
}: Props) {
    let [isRolledUp, setIsRolledUp] = useState(!!initiallyRolledUp);

    function onRollClicked(e: Event) {
        e.preventDefault();
        setIsRolledUp(!isRolledUp);
    }

    let sectionClass = fontClass(font, RenderingDeckPart.UiInterleaved);
    sectionClass += isRolledUp ? " rolled-up" : " rolled-down";
    if (invisible) {
        sectionClass += " invisible";
    }

    const headingClass = "clickable";

    let icon = isRolledUp ? svgChevronDoubleRight() : svgChevronDoubleDown();
    return (
        <section class={sectionClass}>
            <CivContainer>
                <CivLeft ui>
                    <div class="clickable" onClick={onRollClicked}>
                        {icon}
                    </div>
                </CivLeft>
                <CivMain>
                    <div class="block">
                        <span class="button-row">{buttons}</span>
                    </div>
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

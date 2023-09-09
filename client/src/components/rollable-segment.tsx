import { ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import { Font, RenderingDeckPart } from "../types";

import { fontClass } from "../shared/font";

import { CivContainer, CivLeft, CivMain } from "./civil-layout";
import {
    svgChevronDoubleDown,
    svgChevronDoubleRight,
} from "./svg-icons";

// (as opposed to being a part of the ui, e.g. on the front page)
//
type Props = {
    heading: string;
    font: Font;
    buttons?: ComponentChildren;
    children: ComponentChildren;
    initiallyRolledUp?: boolean;
    invisible?: boolean;
    extraClasses?: string;
};

export default function RollableSegment({
    heading,
    font,
    buttons,
    children,
    initiallyRolledUp,
    invisible,
    extraClasses,
}: Props) {
    let [isRolledUp, setIsRolledUp] = useState(!!initiallyRolledUp);

    function onRollClicked(e: Event) {
        e.preventDefault();
        setIsRolledUp(!isRolledUp);
    }

    let sectionClass = extraClasses || "";
    sectionClass += " " + fontClass(font, RenderingDeckPart.UiInterleaved);
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
                        <span class="display-flex-justify-right">
                            {buttons}
                        </span>
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

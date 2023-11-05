import { type ComponentChildren } from "preact";

import { CivContainer, CivLeft, CivMainUi } from "./civil-layout";

type HeadedSegmentProps = {
    heading: string;
    children: ComponentChildren;
    extraClasses?: string;
    extraHeadingClasses?: string;
};

export function HeadedSegment({
    heading,
    children,
    extraClasses,
    extraHeadingClasses,
}: HeadedSegmentProps) {
    let aklass = "c-headed-segment module margin-top-5 ";
    if (extraClasses) {
        aklass += extraClasses;
    }

    let lklass = "ui ";
    if (extraHeadingClasses) {
        lklass += extraHeadingClasses;
    }

    return (
        <article class={aklass}>
            <CivContainer>
                <CivLeft>
                    <h3 class={lklass}>{heading}</h3>
                </CivLeft>
                <CivMainUi>{children}</CivMainUi>
            </CivContainer>
        </article>
    );
}

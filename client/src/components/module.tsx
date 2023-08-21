import { h, ComponentChildren } from "preact";

import { CivContainer, CivLeft, CivMainUi } from "components/civil-layout";

type ModuleProps = {
    heading: string;
    children: ComponentChildren;
    extraClasses?: string;
    extraHeadingClasses?: string;
};

export function Module({
    heading,
    children,
    extraClasses,
    extraHeadingClasses,
}: ModuleProps) {
    let aklass = "module margin-top-9 ";
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

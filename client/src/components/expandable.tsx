import { h, ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import { svgCaretRight, svgCaretDown } from "components/svg-icons";
import { CivContainer, CivMain } from "components/civil-layout";

type ExpandableProps = {
    extraClasses?: string;
    heading: ComponentChildren;
    children: ComponentChildren;
};

export default function Expandable({
    extraClasses,
    heading,
    children,
}: ExpandableProps) {
    const [expanded, setExpanded] = useState(true);

    function onClicked() {
        setExpanded(!expanded);
    }

    let klass = "c-expandable ";
    if (extraClasses) {
        klass += extraClasses;
    }

    let icon = expanded ? svgCaretDown() : svgCaretRight();
    let res = (
        <div class={klass}>
            <CivContainer>
                <CivMain>
                    <span onClick={onClicked}>{icon}</span>
                    {heading}
                </CivMain>
            </CivContainer>

            {expanded && children}
        </div>
    );

    return res;
}

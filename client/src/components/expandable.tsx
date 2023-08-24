import { ComponentChildren, h } from "preact";
import { useEffect, useState } from "preact/hooks";

import { CivContainer, CivMain } from "components/civil-layout";
import { svgCaretDown, svgCaretRight } from "components/svg-icons";

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

    useEffect(() => {
        setExpanded(true);
    }, [heading, children]);

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

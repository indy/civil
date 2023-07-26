import { h, ComponentChildren } from "preact";

import { svgExpand, svgMinimise } from "components/svg-icons";

export default function Toggler({
    toggleShow,
    label,
    show,
    children,
}: {
    toggleShow: () => void;
    label: string;
    show: boolean;
    children: ComponentChildren;
}) {
    return (
        <div>
            <p class="ui toggler-control-and-label" onClick={toggleShow}>
                {show ? svgMinimise() : svgExpand()}
                <span>{label}</span>
            </p>
            {show && children}
        </div>
    );
}

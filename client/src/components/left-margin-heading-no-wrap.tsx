import { ComponentChildren, h } from "preact";

export default function LeftMarginHeadingNoWrap({
    children,
}: {
    children: ComponentChildren;
}) {
    return <div class="left-margin-entry-no-wrap">{children}</div>;
}

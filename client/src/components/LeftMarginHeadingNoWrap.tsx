import { h, ComponentChildren } from "preact";

export default function LeftMarginHeadingNoWrap({
    children,
}: {
    children: ComponentChildren;
}) {
    return (
        <div class="left-margin-entry-no-wrap">
            <div class="left-margin-heading">{children}</div>
        </div>
    );
}

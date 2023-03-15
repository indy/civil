import { h, ComponentChildren } from "preact";

export default function LeftMarginHeading({
    children,
}: {
    children: ComponentChildren;
}) {
    return (
        <div class="left-margin-entry-no-note-on-right">
            <div class="left-margin-heading">{children}</div>
        </div>
    );
}

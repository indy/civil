import { ComponentChildren } from "preact";

export default function LeftMarginHeading({
    children,
}: {
    children: ComponentChildren;
}) {
    return <div class="left-margin-heading-typeface">{children}</div>;
}

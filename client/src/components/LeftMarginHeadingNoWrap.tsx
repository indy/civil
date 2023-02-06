import { h } from "preact";

export default function LeftMarginHeadingNoWrap({children}: {children?: any}) {
    return (
    <div class="left-margin-entry-no-wrap">
        <div class="left-margin-heading">
            { children }
        </div>
    </div>);
}

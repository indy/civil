import { h } from "preact";

export default function LeftMarginHeading({children}: {children?: any}) {
    return <div class="left-margin-entry-no-note-on-right">
        <div class="left-margin-heading">
            { children }
        </div>
    </div>;
}

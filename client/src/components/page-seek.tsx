import { h } from "preact";

import TopBarMenu from "components/top-bar-menu";
import { Module } from "components/module";

export default function Seek({ path }: { path?: string }) {
    return (
        <div>
            <TopBarMenu />
            <SeekModule />
        </div>
    );
}

function SeekModule() {
    return (
        <Module
            extraClasses="c-seek-module"
            heading="Seek"
            extraHeadingClasses="hack-margin-top-minus-half"
        >
            Placeholder
        </Module>
    );
}

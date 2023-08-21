import { h } from "preact";

import TopBarMenu from "components/top-bar-menu";
import { Module } from "components/module";

export default function Stats({ path }: { path?: string }) {
    return (
        <div>
            <TopBarMenu />
            <StatsModule />
        </div>
    );
}

function StatsModule() {
    return (
        <Module
            extraClasses="c-stats-module"
            heading="Stats"
            extraHeadingClasses="hack-margin-top-minus-half"
        >
            Placeholder
        </Module>
    );
}

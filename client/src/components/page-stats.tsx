import { h } from "preact";

import { Module } from "components/module";
import TopBarMenu from "components/top-bar-menu";

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

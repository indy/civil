import { h } from "preact";

import { HeadedSegment } from "components/headed-segment";
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
        <HeadedSegment
            extraClasses="c-stats-module"
            heading="Stats"
            extraHeadingClasses="hack-margin-top-minus-half"
        >
            Placeholder
        </HeadedSegment>
    );
}

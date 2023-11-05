import { HeadedSegment } from "./headed-segment";

export default function Stats({ path }: { path?: string }) {
    return <StatsModule />;
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

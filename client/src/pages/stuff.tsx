import { h } from "preact";

import { LazyLoadedGrouping } from "components/groupings";

export default function Stuff({ path }: { path?: string }) {
    return (
        <article class="listing-page">
            <LazyLoadedGrouping
                label="Recently Visited"
                url="/api/stats/recently_visited"
            />
        </article>
    );
}

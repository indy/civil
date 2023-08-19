import { h } from "preact";

import { EagerLoadedGrouping } from "components/groupings";
import { CivContainer, CivMain, CivLeft } from "components/civil-layout";
import TopBarMenu from "components/top-bar-menu";
import Paginator from "components/paginator";

export default function FrontPage({ path }: { path?: string }) {
    return (
        <div>
            <TopBarMenu />
            <Paginator />
            <RecentlyVisitedModule />
        </div>
    );
}

function RecentlyVisitedModule() {
    return (
        <article class="module margin-top-5">
            <CivContainer>
                <CivLeft>
                    <h3 class="ui hack-margin-top-minus-half">Recently Visited</h3>
                </CivLeft>
                <CivMain>
                    <EagerLoadedGrouping
                        url="/api/decks/recently_visited"
                    />
                </CivMain>
            </CivContainer>
        </article>
    );
}

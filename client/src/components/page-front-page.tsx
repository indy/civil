import { h, ComponentChildren } from "preact";
import { useState, useEffect } from "preact/hooks";

import { SlimDeck, ResultList } from "types";

import Net from "shared/net";

import ListingLink from "components/listing-link";

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
                    <h3 class="ui hack-margin-top-minus-half">
                        Recently Visited
                    </h3>
                </CivLeft>
                <CivMain>
                    <EagerLoadedGrouping url="/api/decks/recently_visited" />
                </CivMain>
            </CivContainer>
        </article>
    );
}

type EagerLoadedGroupingProps = {
    url: string;
};

function EagerLoadedGrouping({ url }: EagerLoadedGroupingProps) {
    type State = {
        fetchedData: boolean;
        list: Array<SlimDeck>;
    };

    let initialState: State = {
        fetchedData: false,
        list: [],
    };
    let [localState, setLocalState] = useState(initialState);

    useEffect(() => {
        Net.get<ResultList>(url).then((resultList) => {
            setLocalState({
                ...localState,
                fetchedData: true,
                list: resultList.results,
            });
        });
    }, []);

    return <ul class="compacted-list">{buildListing(localState.list)}</ul>;
}

function buildListing(list: Array<SlimDeck>): Array<ComponentChildren> {
    return list.map((deck) => <ListingLink slimDeck={deck} />);
}

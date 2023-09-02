import { ComponentChildren, h } from "preact";
import { useEffect, useState } from "preact/hooks";

import { SlimDeck, SlimResults } from "types";

import Net from "shared/net";

import ListingLink from "components/listing-link";
import { HeadedSegment } from "components/headed-segment";
import Paginator from "components/paginator";
import TopBarMenu from "components/top-bar-menu";

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
        <HeadedSegment
            extraClasses="margin-top-5"
            heading="Recently Visited"
            extraHeadingClasses="hack-margin-top-minus-half"
        >
            <EagerLoadedGrouping url="/api/decks/recently_visited?num=30" />
        </HeadedSegment>
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
        Net.get<SlimResults>(url).then((resultList) => {
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

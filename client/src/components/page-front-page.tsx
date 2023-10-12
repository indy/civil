import { type ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

import type { SlimDeck, SlimResults } from "../types";

import Net from "../shared/net";

import ListingLink from "./listing-link";
import { HeadedSegment } from "./headed-segment";
import Paginator from "./paginator";
import TopBarMenu from "./top-bar-menu";
import InsigniaSelector from "./insignia-selector";
import { listItemSlimDeck } from "./list-items";
import Pagination from "./pagination";

export default function FrontPage({ path }: { path?: string }) {
    return (
        <div>
            <TopBarMenu />
            <Paginator />
            <RecentlyVisitedModule />
            <InsigniasModule />
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

function InsigniasModule() {
    type LocalState = {
        insigniaVal: number;
        url: string;
    };

    function buildState(val: number): LocalState {
        return {
            insigniaVal: val,
            url: `/api/decks/insignia_filter/${val}`,
        };
    }

    let [localState, setLocalState] = useState(buildState(2));

    function onChangeInsignia(val: number): void {
        // only select one insignia at a time
        let diff = val ^ localState.insigniaVal;
        setLocalState(buildState(diff));
    }

    return (
        <HeadedSegment
            extraClasses="c-insignias-module"
            heading="Insignias"
            extraHeadingClasses="hack-margin-top-point-2"
        >
            <InsigniaSelector
                insigniaId={localState.insigniaVal}
                onChange={onChangeInsignia}
                extraClasses="hack-force-space-around"
            />
            <Pagination
                url={localState.url}
                renderItem={listItemSlimDeck}
                itemsPerPage={15}
            />
        </HeadedSegment>
    );
}

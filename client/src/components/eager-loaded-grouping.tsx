import { type ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

import type { SlimDeck, SlimResults } from "../types";

import Net from "../shared/net";

import ListingLink from "./listing-link";

type EagerLoadedGroupingProps = {
    url: string;
};

export default function EagerLoadedGrouping({ url }: EagerLoadedGroupingProps) {
    type State = {
        fetchedData: boolean;
        list: Array<SlimDeck>;
    };

    let [localState, setLocalState] = useState<State>({
        fetchedData: false,
        list: [],
    });

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

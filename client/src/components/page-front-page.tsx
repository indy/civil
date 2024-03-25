import { useState } from "preact/hooks";

import { HeadedSegment } from "./headed-segment";
import Paginator from "./paginator";
import InsigniaSelector from "./insignia-selector";
import { listItemSlimDeck } from "./list-items";
import Pagination from "./pagination";
import RecentlyVisited from "./recently-visited";

export default function FrontPage({ path }: { path?: string }) {
    return (
        <div>
            <Paginator />
            <RecentlyVisited numRecent={30} />
            <InsigniasModule />
        </div>
    );
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

    let [localState, setLocalState] = useState<LocalState>(buildState(2));

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

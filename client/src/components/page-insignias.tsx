import { useState } from "preact/hooks";

import InsigniaSelector from "./insignia-selector";
import { HeadedSegment } from "./headed-segment";
import { renderPaginatedSlimDeck } from "./paginated-render-items";
import Pagination from "./pagination";
import TopBarMenu from "./top-bar-menu";

export default function Insignias({ path }: { path?: string }) {
    return (
        <div>
            <TopBarMenu />
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
                renderItem={renderPaginatedSlimDeck}
                itemsPerPage={15}
            />
        </HeadedSegment>
    );
}

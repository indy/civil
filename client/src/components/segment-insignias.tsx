import { useState } from "preact/hooks";

import { DeckKind } from "../enums";

import { deckKindToResourceString } from "../shared/deck";
import { capitalise } from "../shared/english";

import { HeadedSegment } from "./headed-segment";
import InsigniaSelector from "./insignia-selector";
import { listItemSlimDeck } from "./list-items";
import Pagination from "./pagination";

type SegmentInsigniasProps = {
    deckKind?: DeckKind;
};

export default function SegmentInsignias({ deckKind }: SegmentInsigniasProps) {
    type LocalState = {
        insigniaVal: number;
        url: string;
    };

    function buildState(val: number): LocalState {
        let url = `/api/decks/insignias?insignia=${val}`;
        if (deckKind) {
            const resource = deckKindToResourceString(deckKind);
            url += `&resource=${resource}`;
        }

        return {
            insigniaVal: val,
            url,
        };
    }

    let [localState, setLocalState] = useState<LocalState>(buildState(2));

    let heading = "Insignias";
    if (deckKind) {
        let resource = deckKindToResourceString(deckKind);
        heading = `${capitalise(resource)} with Insignias`;
    }

    function onChangeInsignia(val: number): void {
        // only select one insignia at a time
        let diff = val ^ localState.insigniaVal;
        setLocalState(buildState(diff));
    }

    return (
        <HeadedSegment
            extraClasses="c-segment-insignias"
            heading={heading}
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
                urlHasArguments={true}
            />
        </HeadedSegment>
    );
}

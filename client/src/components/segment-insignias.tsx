import { useEffect, useState } from "preact/hooks";

import { DeckKind } from "../enums";

import { deckKindToResourceString } from "../shared/deck";
import { capitalise } from "../shared/english";
import { getUrlParamNumber, setUrlParam } from "../shared/url-params";

import { HeadedSegment } from "./headed-segment";
import InsigniaSelector from "./insignia-selector";
import { listItemSlimDeck } from "./list-items";
import Pagination from "./pagination";

type SegmentInsigniasProps = {
    deckKind?: DeckKind;
};

export default function SegmentInsignias({ deckKind }: SegmentInsigniasProps) {

    const [mask, setMask] = useState(getUrlParamNumber("insignia-mask", 2));
    const [offset, setOffset] = useState(getUrlParamNumber("insignia-offset", 0));

    useEffect(() => {
        setUrlParam("insignia-mask", `${mask}`);
    }, [mask]);

    useEffect(() => {
        setUrlParam("insignia-offset", `${offset}`);
    }, [offset]);

    function setMaskAndResetOffset(m: number) {
        // only select one insignia at a time
        let diff = m ^ mask;
        setMask(diff);
        setOffset(0);
    }

    function buildUrl() {
        let url = `/api/decks/insignias?insignia=${mask}`;
        if (deckKind) {
            const resource = deckKindToResourceString(deckKind);
            url += `&resource=${resource}`;
        }
        return url;
    }

    let heading = "Insignias";
    if (deckKind) {
        let resource = deckKindToResourceString(deckKind);
        heading = `${capitalise(resource)} with Insignias`;
    }

    return (
        <HeadedSegment
            extraClasses="c-segment-insignias"
            heading={heading}
            extraHeadingClasses="hack-margin-top-point-2"
        >
            <InsigniaSelector
                insigniaId={mask}
                onChange={setMaskAndResetOffset}
                extraClasses="hack-force-space-around"
            />
            <Pagination
                url={buildUrl()}
                renderItem={listItemSlimDeck}
                offset={offset}
                changedOffset={setOffset}
                itemsPerPage={15}
                urlHasArguments={true}
            />
        </HeadedSegment>
    );
}

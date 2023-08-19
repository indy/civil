import { h } from "preact";
import { useState } from "preact/hooks";

import Toggler from "components/toggler";

import InsigniaSelector from "components/insignia-selector";
import Pagination from "components/pagination";
import { renderPaginatedSlimDeck } from "components/paginated-render-items";

type InsigniaGroupingProps = {
    label: string;
};

export default function InsigniaGrouping({ label }: InsigniaGroupingProps) {
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
    let [show, setShow] = useState(false);

    function toggleShow() {
        setShow(!show);
    }

    function onChangeInsignia(val: number): void {
        // only select one insignia at a time
        let diff = val ^ localState.insigniaVal;
        setLocalState(buildState(diff));
    }

    return (
        <Toggler toggleShow={toggleShow} label={label} show={show}>
            <InsigniaSelector
                insigniaId={localState.insigniaVal}
                onChange={onChangeInsignia}
            />
            <Pagination
                url={localState.url}
                renderItem={renderPaginatedSlimDeck}
                itemsPerPage={15}
            />
        </Toggler>
    );
}

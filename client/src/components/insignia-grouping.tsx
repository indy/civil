import { h } from "preact";
import { useState } from "preact/hooks";

import { SlimDeck } from "types";
import ListingLink from "components/listing-link";

import Toggler from "components/toggler";

import InsigniaSelector from "components/insignia-selector";
import Pagination from "components/pagination";

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

    function renderItem(deck: SlimDeck, i: number) {
        return (
            <ListingLink
                slimDeck={deck}
                extraClasses={i % 2 ? "stripe-a" : "stripe-b"}
            />
        );
    }

    return (
        <Toggler toggleShow={toggleShow} label={label} show={show}>
            <InsigniaSelector
                insigniaId={localState.insigniaVal}
                onChange={onChangeInsignia}
            />
            <Pagination
                url={localState.url}
                renderItem={renderItem}
                itemsPerPage={15}
            />
        </Toggler>
    );
}

import { h, ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import { SlimDeck, ResultList } from "types";
import ListingLink from "components/listing-link";

import Net from "shared/net";
import Toggler from "components/toggler";

import InsigniaSelector from "components/insignia-selector";

type InsigniaGroupingProps = {
    label: string;
};

export default function InsigniaGrouping({ label }: InsigniaGroupingProps) {
    type State = {
        list: Array<SlimDeck>;
        show: boolean;
        insigniaVal: number;
    };

    let initialState: State = {
        list: [],
        show: false,
        insigniaVal: 2,
    };
    let [localState, setLocalState] = useState(initialState);

    function fetchData(val: number) {
        const url = `/api/decks/insignia_filter/${val}`;
        Net.get<ResultList>(url).then((resultList) => {
            if (resultList.results) {
                setLocalState({
                    ...localState,
                    list: resultList.results,
                    show: true,
                    insigniaVal: val,
                });
            }
        });
    }

    function toggleShow() {
        const visible = !localState.show;
        setLocalState({
            ...localState,
            show: visible,
        });
        if (visible) {
            fetchData(localState.insigniaVal);
        }
    }

    function onChangeInsignia(val: number): void {
        let diff = val ^ localState.insigniaVal;

        if (diff !== 0) {
            fetchData(diff);
        } else {
            setLocalState({
                ...localState,
                insigniaVal: 0,
            });
        }
    }

    return (
        <Toggler toggleShow={toggleShow} label={label} show={localState.show}>
            <InsigniaSelector
                insigniaId={localState.insigniaVal}
                onChange={onChangeInsignia}
            />
            <ul class="compacted-list">
                {localState.show && buildListing(localState.list)}
            </ul>
        </Toggler>
    );
}

function buildListing(list: Array<SlimDeck>): Array<ComponentChildren> {
    return list.map((deck) => <ListingLink slimDeck={deck} />);
}

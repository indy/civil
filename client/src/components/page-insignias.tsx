import { h } from "preact";
import { useState } from "preact/hooks";

import TopBarMenu from "components/top-bar-menu";
import InsigniaSelector from "components/insignia-selector";
import Pagination from "components/pagination";
import { renderPaginatedSlimDeck } from "components/paginated-render-items";

import { CivContainer, CivMain, CivLeft } from "components/civil-layout";

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
        <article class="c-insignias-module module margin-top-9">
            <CivContainer>
                <CivLeft>
                    <h3 class="ui hack-margin-top-point-2">Insignias</h3>
                </CivLeft>
                <CivMain>
            <InsigniaSelector
                insigniaId={localState.insigniaVal}
                onChange={onChangeInsignia}
            />
            <Pagination
                url={localState.url}
                renderItem={renderPaginatedSlimDeck}
                itemsPerPage={15}
            />
                </CivMain>
            </CivContainer>
        </article>
    );
}

import { type ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

import type { SlimDeck, PaginationResults } from "../types";

import Net from "../shared/net";

import CivilButton from "./civil-button";

type LocalState = {
    offset: number;
    itemsPerPage: number;
    items: Array<any>;
    totalItems: number;
    lastUrl: string;
};

export default function Pagination({
    url,
    renderItem,
    itemsPerPage,
    upperContent,
    lowerContent,
}: {
    url: string;
    renderItem: (s: SlimDeck, i: number) => ComponentChildren;
    itemsPerPage: number;
    upperContent?: ComponentChildren;
    lowerContent?: ComponentChildren;
}) {
    const [localState, setLocalState] = useState<LocalState>({
        offset: 0,
        itemsPerPage,
        items: [],
        totalItems: 0,
        lastUrl: "",
    });

    function fetchData() {
        const offset = localState.offset;
        const numItems = localState.itemsPerPage;

        const fullUrl = `${url}?offset=${offset}&numItems=${numItems}`;
        // don't fetch the same data that we already have
        //
        if (fullUrl !== localState.lastUrl) {
            // console.log("fetching: " + fullUrl);
            Net.get<PaginationResults>(fullUrl).then((paginationResults) => {
                // console.log(paginationResults);
                setLocalState({
                    ...localState,
                    items: paginationResults.items,
                    totalItems: paginationResults.totalItems,
                    lastUrl: url,
                });
            });
        }
    }

    useEffect(() => {
        fetchData();
    }, [localState.offset]);

    useEffect(() => {
        if (localState.offset !== 0) {
            // changing offset will invoke the useEffect which will fetchData
            setLocalState({
                ...localState,
                offset: 0,
            });
        } else {
            fetchData();
        }
    }, [url]);

    function changedOffset(offset: number) {
        setLocalState({
            ...localState,
            offset,
        });
    }

    function onPrevClicked() {
        changedOffset(Math.max(localState.offset - localState.itemsPerPage, 0));
    }

    function onNextClicked() {
        changedOffset(localState.offset + localState.itemsPerPage);
    }

    function isPrevDisabled(): boolean {
        return localState.offset === 0;
    }

    function isNextDisabled(): boolean {
        return (
            localState.offset + localState.itemsPerPage >= localState.totalItems
        );
    }

    let maxPages = localState.totalItems / itemsPerPage;
    if (localState.totalItems % itemsPerPage > 0) {
        maxPages += 1;
    }
    maxPages = Math.floor(maxPages);

    const pageNumber = 1 + localState.offset / localState.itemsPerPage;

    return (
        <div class="c-pagination">
            <div class="top-border-line">
                <div class="ui pagination-ui-row">
                    {upperContent}
                    <div class="margin-left-auto">
                        <CivilButton
                            onClick={onPrevClicked}
                            disabled={isPrevDisabled()}
                        >
                            PrevPage
                        </CivilButton>
                        <CivilButton
                            onClick={onNextClicked}
                            disabled={isNextDisabled()}
                        >
                            NextPage
                        </CivilButton>
                    </div>
                </div>
            </div>
            <ul class="bottom-border-line standard-list">
                {localState.items.map((item, i) => renderItem(item, i))}
            </ul>
            <div class="ui pagination-ui-row">
                {lowerContent}
                <div class="margin-left-auto">
                    Page {pageNumber}/{maxPages}
                </div>
            </div>
        </div>
    );
}

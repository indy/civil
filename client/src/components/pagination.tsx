import { type ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

import type { SlimDeck, PaginationResults } from "../types";

import Net from "../shared/net";

import CivilButton from "./civil-button";

type LocalState = {
    itemsPerPage: number;
    items: Array<any>;
    totalItems: number;
    lastUrl: string;
};

export default function Pagination({
    url,
    renderItem,
    offset,
    changedOffset,
    itemsPerPage,
    upperContent,
    lowerContent,
    urlHasArguments,
}: {
    url: string;
    renderItem: (s: SlimDeck, i: number) => ComponentChildren;
    offset: number;
    changedOffset: (o: number) => void;
    itemsPerPage: number;
    upperContent?: ComponentChildren;
    lowerContent?: ComponentChildren;
    urlHasArguments?: boolean;
}) {
    const [localState, setLocalState] = useState<LocalState>({
        itemsPerPage,
        items: [],
        totalItems: 0,
        lastUrl: "",
    });

    function fetchData() {
        const numItems = localState.itemsPerPage;

        const sep = urlHasArguments ? "&" : "?";
        const fullUrl = `${url}${sep}offset=${offset}&numItems=${numItems}`;
        // don't fetch the same data that we already have
        //
        if (fullUrl !== localState.lastUrl) {
            console.log("fetching: " + fullUrl);
            Net.get<PaginationResults>(fullUrl).then((paginationResults) => {
                // console.log(paginationResults);
                setLocalState(prev => ({
                    ...prev,
                    items: paginationResults.items,
                    totalItems: paginationResults.totalItems,
                    lastUrl: url,
                }));
            });
        }
    }

    useEffect(() => {
        // FIXME: reduce the number of fetchData calls
        console.log("fetching data 1");
        fetchData();
    }, [offset]);

    useEffect(() => {
        if (offset === 0) {
            // FIXME: reduce the number of fetchData calls
            console.log("fetching data 2");
            fetchData();
        }
    }, [url]);

    function onPrevClicked() {
        changedOffset(Math.max(offset - localState.itemsPerPage, 0));
    }

    function onNextClicked() {
        changedOffset(offset + localState.itemsPerPage);
    }

    function isPrevDisabled(): boolean {
        return offset === 0;
    }

    function isNextDisabled(): boolean {
        return (
            offset + localState.itemsPerPage >= localState.totalItems
        );
    }

    let maxPages = localState.totalItems / itemsPerPage;
    if (localState.totalItems % itemsPerPage > 0) {
        maxPages += 1;
    }
    maxPages = Math.floor(maxPages);

    const pageNumber = 1 + offset / localState.itemsPerPage;

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

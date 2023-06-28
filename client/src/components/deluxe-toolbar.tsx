import { h, ComponentChildren } from "preact";

import { ToolbarMode } from "types";

import { getAppState, AppStateChange } from "app-state";
import {
    svgEdit,
    svgLinkAlt,
    svgFlashCard,
    svgAddAbove,
    svgScratchList,
    svgSearch,
} from "components/svg-icons";

export function DeluxeToolbar({}) {
    const appState = getAppState();

    let classes = "deluxe-toolbar";

    if (appState.toolbarMode.value === ToolbarMode.View) {
        classes += " deluxe-toolbar-faded";
    }

    // e.g. appState.url.value = /articles or /ideas/42
    // urlParts is of either one of these forms: ["", "articles"], or ["", "ideas", "42"]
    let urlParts = appState.url.value.split("/");

    const onListingPage = urlParts.length === 2;

    function canShow(toolbarMode: ToolbarMode): boolean {
        switch (toolbarMode) {
            case ToolbarMode.View:
                return !onListingPage;
            case ToolbarMode.Search:
                return true;
            case ToolbarMode.Edit:
                return !onListingPage;
            case ToolbarMode.Refs:
                return !onListingPage;
            case ToolbarMode.SR:
                return !onListingPage;
            case ToolbarMode.AddAbove:
                // don't show AddAbove option for quotes
                return !onListingPage && urlParts[1] !== "quotes";
            case ToolbarMode.ScratchListLinks:
                return true;
        }
    }

    return (
        <div class={classes}>
            {canShow(ToolbarMode.Search) && (
                <ToolbarItem
                    toolbarMode={ToolbarMode.Search}
                    toolbarText="Search"
                >
                    {svgSearch()}
                </ToolbarItem>
            )}
            {canShow(ToolbarMode.Edit) && (
                <ToolbarItem toolbarMode={ToolbarMode.Edit} toolbarText="Edit">
                    {svgEdit()}
                </ToolbarItem>
            )}
            {canShow(ToolbarMode.Refs) && (
                <ToolbarItem toolbarMode={ToolbarMode.Refs} toolbarText="Refs">
                    {svgLinkAlt()}
                </ToolbarItem>
            )}
            {canShow(ToolbarMode.SR) && (
                <ToolbarItem
                    toolbarMode={ToolbarMode.SR}
                    toolbarText="Memorise"
                >
                    {svgFlashCard()}
                </ToolbarItem>
            )}
            {canShow(ToolbarMode.AddAbove) && (
                <ToolbarItem
                    toolbarMode={ToolbarMode.AddAbove}
                    toolbarText="Add Above"
                >
                    {svgAddAbove()}
                </ToolbarItem>
            )}
            {canShow(ToolbarMode.ScratchListLinks) && (
                <ToolbarItem
                    toolbarMode={ToolbarMode.ScratchListLinks}
                    toolbarText="Bookmarks"
                >
                    {svgScratchList()}
                </ToolbarItem>
            )}
        </div>
    );
}

function ToolbarItem({
    toolbarMode,
    toolbarText,
    children,
}: {
    toolbarMode: ToolbarMode;
    toolbarText: string;
    children: ComponentChildren;
}) {
    const appState = getAppState();

    function onClickHandler() {
        if (appState.toolbarMode.value === toolbarMode) {
            // toggle the current mode off
            AppStateChange.toolbarMode(ToolbarMode.View);
            AppStateChange.setShowingCommandBar(false);
        } else {
            AppStateChange.toolbarMode(toolbarMode);
            if (
                toolbarMode === ToolbarMode.Search &&
                appState.showingCommandBar.value === false
            ) {
                AppStateChange.setShowingCommandBar(true);
            }
        }
    }

    let classes = "toolbar-item-icon";
    if (toolbarMode === appState.toolbarMode.value) {
        classes += addActiveToolbarClasses(toolbarMode);
    }

    return (
        <div class="toolbar-item" onClick={onClickHandler}>
            <span class={classes}>{children}</span>
            <span class="toolbar-item-text">{toolbarText}</span>
        </div>
    );
}

export function addActiveToolbarClasses(toolbarMode: ToolbarMode) {
    switch (toolbarMode) {
        case ToolbarMode.View:
            return " ";
        case ToolbarMode.Search:
            return " ";
        case ToolbarMode.Edit:
            return " toolbar-item-selected toolbar-item-selected-edit";
        case ToolbarMode.Refs:
            return " toolbar-item-selected toolbar-item-selected-refs";
        case ToolbarMode.SR:
            return " toolbar-item-selected toolbar-item-selected-sr";
        case ToolbarMode.AddAbove:
            return " toolbar-item-selected toolbar-item-selected-add-above";
        case ToolbarMode.ScratchListLinks:
            return " toolbar-item-selected toolbar-item-selected-scratchlist-links";
    }
}

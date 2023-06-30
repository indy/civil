import { h, ComponentChildren } from "preact";
import { Link } from "preact-router";

import { ToolbarMode } from "types";

import { getAppState, isToolbarModeAllowed, AppStateChange } from "app-state";
import {
    svgEdit,
    svgLinkAlt,
    svgFlashCard,
    svgAddAbove,
    svgScratchList,
    svgSearch,
    svgHome,
} from "components/svg-icons";

export function DeluxeToolbar({}) {
    const appState = getAppState();

    let classes = "deluxe-toolbar";

    if (appState.toolbarMode.value === ToolbarMode.View) {
        classes += " deluxe-toolbar-faded";
    }

    return (
        <div class={classes}>
            <div class="toolbar-item">
                <Link class="toolbar-item-icon" href="/">
                    {svgHome()}
                </Link>
                <span class="toolbar-item-text">Home</span>
            </div>

            <div class="toolbar-item" onClick={AppStateChange.cbSearchClicked}>
                <span class="toolbar-item-icon">{svgSearch()}</span>
                <span class="toolbar-item-text">Search</span>
            </div>

            {isToolbarModeAllowed(appState, ToolbarMode.Edit) && (
                <ToolbarItem toolbarMode={ToolbarMode.Edit} toolbarText="Edit">
                    {svgEdit()}
                </ToolbarItem>
            )}
            {isToolbarModeAllowed(appState, ToolbarMode.Refs) && (
                <ToolbarItem toolbarMode={ToolbarMode.Refs} toolbarText="Refs">
                    {svgLinkAlt()}
                </ToolbarItem>
            )}
            {isToolbarModeAllowed(appState, ToolbarMode.SR) && (
                <ToolbarItem
                    toolbarMode={ToolbarMode.SR}
                    toolbarText="Memorise"
                >
                    {svgFlashCard()}
                </ToolbarItem>
            )}
            {isToolbarModeAllowed(appState, ToolbarMode.AddAbove) && (
                <ToolbarItem
                    toolbarMode={ToolbarMode.AddAbove}
                    toolbarText="Add Above"
                >
                    {svgAddAbove()}
                </ToolbarItem>
            )}
            {isToolbarModeAllowed(appState, ToolbarMode.ScratchListLinks) && (
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

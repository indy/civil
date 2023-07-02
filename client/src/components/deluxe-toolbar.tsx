import { h, ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { Link } from "preact-router";

import { ToolbarMode } from "types";

import { getAppState, isToolbarModeAllowed, AppStateChange } from "app-state";
import {
    svgCircle,
    svgFilledCircle,
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

    const [active, setActive] = useState(true);

    let classes = "deluxe-toolbar";

    let toggleIcon = svgFilledCircle;

    let currentToolbarMode = appState.toolbarMode.value;
    if (currentToolbarMode === ToolbarMode.View) {
        classes += " deluxe-toolbar-faded";
        toggleIcon = svgCircle;
    }

    if (active) {
        classes += " deluxe-toolbar-active";
    }

    let searchClasses = "toolbar-item-icon";

    function toggleActive() {
        setActive(!active);
    }

    return (
        <div>
            <div class="deluxe-toolbar-toggle-control" onClick={toggleActive}>
                {toggleIcon(toolbarColourCss(currentToolbarMode))}
            </div>
            <div class={classes}>
                <div class="toolbar-item">
                    <Link class="toolbar-item-icon" href="/">
                        {svgHome()}
                    </Link>
                    <span class="toolbar-item-text">Home</span>
                </div>

                <div
                    class="toolbar-item"
                    onClick={AppStateChange.cbSearchClicked}
                >
                    <span class={searchClasses}>{svgSearch()}</span>
                    <span class="toolbar-item-text">Search</span>
                </div>

                {isToolbarModeAllowed(appState, ToolbarMode.Edit) && (
                    <ToolbarItem
                        toolbarMode={ToolbarMode.Edit}
                        toolbarText="Edit"
                    >
                        {svgEdit()}
                    </ToolbarItem>
                )}
                {isToolbarModeAllowed(appState, ToolbarMode.Refs) && (
                    <ToolbarItem
                        toolbarMode={ToolbarMode.Refs}
                        toolbarText="Refs"
                    >
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
                {isToolbarModeAllowed(
                    appState,
                    ToolbarMode.ScratchListLinks
                ) && (
                    <ToolbarItem
                        toolbarMode={ToolbarMode.ScratchListLinks}
                        toolbarText="Bookmarks"
                    >
                        {svgScratchList()}
                    </ToolbarItem>
                )}
            </div>
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
        classes += toolbarItemSelectedCss(toolbarMode);
    }

    return (
        <div class="toolbar-item" onClick={onClickHandler}>
            <span class={classes}>{children}</span>
            <span class="toolbar-item-text">{toolbarText}</span>
        </div>
    );
}

function toolbarItemSelectedCss(toolbarMode: ToolbarMode) {
    return " toolbar-item-selected-" + baseCssName(toolbarMode);
}

function toolbarColourCss(toolbarMode: ToolbarMode) {
    return " toolbar-" + baseCssName(toolbarMode) + "-colour";
}

function baseCssName(toolbarMode: ToolbarMode) {
    switch (toolbarMode) {
        case ToolbarMode.View:
            return "view";
        case ToolbarMode.Edit:
            return "edit";
        case ToolbarMode.Refs:
            return "refs";
        case ToolbarMode.SR:
            return "sr";
        case ToolbarMode.AddAbove:
            return "add-above";
        case ToolbarMode.ScratchListLinks:
            return "scratchlist-links";
    }
}

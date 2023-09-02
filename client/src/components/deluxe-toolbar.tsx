import { ComponentChildren, h } from "preact";
import { Link } from "preact-router";
import { useState } from "preact/hooks";

import { CivilMode } from "types";

import { AppStateChange, getAppState } from "app-state";

import { isCivilModeAllowed } from "shared/civil";
import { visibleClass } from "shared/css";

import {
    svgAddAbove,
    svgBookmark,
    svgCircle,
    svgEdit,
    svgFilledCircle,
    svgFlashCard,
    svgHome,
    svgLinkAlt,
    svgSearch,
} from "components/svg-icons";

export function DeluxeToolbar({}) {
    const appState = getAppState();

    const [active, setActive] = useState(true);

    let classes = "deluxe-toolbar";

    let toggleIcon = svgFilledCircle;

    let currentCivilMode = appState.mode.value;
    if (currentCivilMode === CivilMode.View) {
        if (active) {
            classes += " deluxe-toolbar-faded";
        }
        toggleIcon = svgCircle;
    }

    classes += visibleClass("deluxe-toolbar", active);

    let searchClasses = "toolbar-item-icon";

    function toggleActive() {
        setActive(!active);
    }

    function searchClicked() {
        AppStateChange.mode({ mode: CivilMode.View });
        if (appState.showingCommandBar.value) {
            AppStateChange.commandBarResetAndHide();
        } else {
            AppStateChange.commandBarResetAndShow();
        }
    }

    function clickedHome() {
        AppStateChange.urlTitle({ title: "home" });
        AppStateChange.mode({ mode: CivilMode.View });
        AppStateChange.commandBarResetAndHide();
    }

    return (
        <div>
            <div class="deluxe-toolbar-toggle-control" onClick={toggleActive}>
                {toggleIcon(toolbarColourCss(currentCivilMode))}
            </div>
            <div class={classes}>
                <div class="toolbar-item">
                    <Link
                        onClick={clickedHome}
                        class="toolbar-item-icon"
                        href="/"
                    >
                        {svgHome()}
                    </Link>
                    <span class="toolbar-item-text">Home</span>
                </div>

                <div class="toolbar-item" onClick={searchClicked}>
                    <span class={searchClasses}>{svgSearch()}</span>
                    <span class="toolbar-item-text">Quick Search</span>
                </div>

                {isCivilModeAllowed(appState, CivilMode.Edit) && (
                    <ToolbarItem mode={CivilMode.Edit} toolbarText="Edit">
                        {svgEdit()}
                    </ToolbarItem>
                )}
                {isCivilModeAllowed(appState, CivilMode.Refs) && (
                    <ToolbarItem mode={CivilMode.Refs} toolbarText="Refs">
                        {svgLinkAlt()}
                    </ToolbarItem>
                )}
                {isCivilModeAllowed(appState, CivilMode.Memorise) && (
                    <ToolbarItem
                        mode={CivilMode.Memorise}
                        toolbarText="Memorise"
                    >
                        {svgFlashCard()}
                    </ToolbarItem>
                )}
                {isCivilModeAllowed(appState, CivilMode.AddAbove) && (
                    <ToolbarItem
                        mode={CivilMode.AddAbove}
                        toolbarText="Add Above"
                    >
                        {svgAddAbove()}
                    </ToolbarItem>
                )}
                {isCivilModeAllowed(appState, CivilMode.BookmarkLinks) && (
                    <ToolbarItem
                        mode={CivilMode.BookmarkLinks}
                        toolbarText="Bookmarks"
                    >
                        {svgBookmark()}
                    </ToolbarItem>
                )}
            </div>
        </div>
    );
}

function ToolbarItem({
    mode,
    toolbarText,
    children,
}: {
    mode: CivilMode;
    toolbarText: string;
    children: ComponentChildren;
}) {
    const appState = getAppState();

    function onClickHandler() {
        if (appState.mode.value === mode) {
            // toggle the current mode off
            AppStateChange.mode({ mode: CivilMode.View });
            AppStateChange.commandBarResetAndHide();
        } else {
            AppStateChange.mode({ mode });
        }
    }

    let classes = "toolbar-item-icon";
    if (mode === appState.mode.value) {
        classes += toolbarItemSelectedCss(mode);
    }

    return (
        <div class="toolbar-item" onClick={onClickHandler}>
            <span class={classes}>{children}</span>
            <span class="toolbar-item-text">{toolbarText}</span>
        </div>
    );
}

function toolbarItemSelectedCss(mode: CivilMode) {
    return " toolbar-item-selected-" + baseCssName(mode);
}

function toolbarColourCss(mode: CivilMode) {
    return " toolbar-" + baseCssName(mode) + "-colour";
}

function baseCssName(mode: CivilMode) {
    switch (mode) {
        case CivilMode.View:
            return "view";
        case CivilMode.Edit:
            return "edit";
        case CivilMode.Refs:
            return "refs";
        case CivilMode.Memorise:
            return "memorise";
        case CivilMode.AddAbove:
            return "add-above";
        case CivilMode.BookmarkLinks:
            return "bookmark-links";
    }
}

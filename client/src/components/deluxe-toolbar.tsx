import { type ComponentChildren } from "preact";
import { Link } from "preact-router";
import { useState } from "preact/hooks";

import { CivilMode } from "../enums";

import { AppStateChange, getAppState } from "../app-state";

import { isCivilModeAllowed } from "../shared/civil";
import { visibleClass } from "../shared/css";

import {
    svgUpperInsert,
    svgBookmark,
    svgCircle,
    svgEdit,
    svgFilledCircle,
    svgFlashCard,
    svgGrid,
    svgHome,
    svgLogout,
    svgReviewCards,
    svgSettings,
    svgStats,
    svgLinkAlt,
    svgSearch,
} from "./svg-icons";

type LocalState = {
    active: boolean;
    showGrid: boolean;
};

export function DeluxeToolbar({}) {
    const appState = getAppState();

    const [localState, setLocalState] = useState<LocalState>({
        active: true,
        showGrid: false,
    });

    let classes = "deluxe-toolbar";

    let toggleIcon = svgFilledCircle;

    let currentCivilMode = appState.mode.value;
    if (currentCivilMode === CivilMode.View) {
        if (localState.active) {
            classes += " deluxe-toolbar-faded";
        }
        toggleIcon = svgCircle;
    }

    classes += visibleClass("deluxe-toolbar", localState.active);

    let searchClasses = "toolbar-item-icon";

    function toggleActive() {
        setLocalState({
            ...localState,
            active: !localState.active,
        });
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

    function clickedGrid() {
        setLocalState({
            ...localState,
            showGrid: !localState.showGrid,
        });
    }

    function Hicon({ href, children }: { href: string; children: any }) {
        return (
            <span class="toolbar-item">
                <Link href={href} class="toolbar-item-icon">
                    {children}
                </Link>
            </span>
        );
    }
    function renderGrid() {
        let memoriseColour = "svg-fill-colour";
        if (appState.memoriseReviewCount.value > 0) {
            memoriseColour += "-attention-required";
        }

        return (
            <div class="deluxe-toolbar-grid">
                <span>
                    <span class="toolbar-item">
                        <Link
                            onClick={clickedHome}
                            class="toolbar-item-icon"
                            href="/"
                        >
                            {svgHome()}
                        </Link>
                    </span>
                    <Hicon href="/memorise">
                        {svgReviewCards(memoriseColour)}
                    </Hicon>
                    <Hicon href="/stats">{svgStats()}</Hicon>
                    <Hicon href="/account-settings">{svgSettings()}</Hicon>
                    <Hicon href="/logout">{svgLogout()}</Hicon>
                </span>
            </div>
        );
    }

    return (
        <div>
            <div class="deluxe-toolbar-toggle-control" onClick={toggleActive}>
                {toggleIcon(toolbarColourCss(currentCivilMode))}
            </div>
            <div class={classes}>
                <div class="toolbar-item" onClick={clickedGrid}>
                    <span class="toolbar-item-icon">{svgGrid()}</span>
                    {localState.showGrid && renderGrid()}
                </div>

                <div class="toolbar-item" onClick={searchClicked}>
                    <span class={searchClasses}>{svgSearch()}</span>
                    <span class="toolbar-item-text">Search (/)</span>
                </div>

                {isCivilModeAllowed(appState, CivilMode.Refs) && (
                    <ToolbarItem mode={CivilMode.Refs} toolbarText="Refs (r)">
                        {svgLinkAlt()}
                    </ToolbarItem>
                )}
                {isCivilModeAllowed(appState, CivilMode.Edit) && (
                    <ToolbarItem mode={CivilMode.Edit} toolbarText="Edit (n)">
                        {svgEdit()}
                    </ToolbarItem>
                )}
                {isCivilModeAllowed(appState, CivilMode.UpperInsert) && (
                    <ToolbarItem
                        mode={CivilMode.UpperInsert}
                        toolbarText="Upper Insert (u)"
                    >
                        {svgUpperInsert()}
                    </ToolbarItem>
                )}
                {isCivilModeAllowed(appState, CivilMode.Memorise) && (
                    <ToolbarItem
                        mode={CivilMode.Memorise}
                        toolbarText="Memorise Card (c)"
                    >
                        {svgFlashCard()}
                    </ToolbarItem>
                )}
                {isCivilModeAllowed(appState, CivilMode.BookmarkLinks) && (
                    <ToolbarItem
                        mode={CivilMode.BookmarkLinks}
                        toolbarText="Bookmarks (b)"
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
        case CivilMode.UpperInsert:
            return "upper-insert";
        case CivilMode.BookmarkLinks:
            return "bookmark-links";
    }
}

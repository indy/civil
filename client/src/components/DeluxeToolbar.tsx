import { h, ComponentChildren } from "preact";

import { ToolbarMode } from "../types";

import { getAppState, AppStateChange } from "../AppState";
import { svgEdit, svgLinkAlt, svgFlashCard, svgAddAbove } from "../svgIcons";

export function DeluxeToolbar({}) {
    const appState = getAppState();

    let classes = "deluxe-toolbar";

    if (appState.toolbarMode.value === ToolbarMode.View) {
        classes += " deluxe-toolbar-faded";
    }

    function canShow(toolbarMode: ToolbarMode): boolean {
        if (toolbarMode == ToolbarMode.AddAbove) {
            // don't show Prepend option for quotes
            return !appState.url.value.startsWith("/quotes/");
        }
        return true;
    }

    return (
        <div class={classes}>
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
                <ToolbarItem toolbarMode={ToolbarMode.SR} toolbarText="SR">
                    {svgFlashCard()}
                </ToolbarItem>
            )}
            {canShow(ToolbarMode.AddAbove) && (
                <ToolbarItem
                    toolbarMode={ToolbarMode.AddAbove}
                    toolbarText="Prepend"
                >
                    {svgAddAbove()}
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
        } else {
            AppStateChange.toolbarMode(toolbarMode);
        }
    }

    let classes = "toolbar-item";
    if (toolbarMode === appState.toolbarMode.value) {
        classes += addActiveToolbarClasses(toolbarMode);
    }

    return (
        <div class={classes} onClick={onClickHandler}>
            {children}
            <span class="toolbar-item-text">{toolbarText}</span>
        </div>
    );
}

export function addActiveToolbarClasses(toolbarMode: ToolbarMode) {
    switch (toolbarMode) {
        case ToolbarMode.Edit:
            return " toolbar-item-selected toolbar-item-selected-edit";
        case ToolbarMode.Refs:
            return " toolbar-item-selected toolbar-item-selected-refs";
        case ToolbarMode.SR:
            return " toolbar-item-selected toolbar-item-selected-sr";
        case ToolbarMode.AddAbove:
            return " toolbar-item-selected toolbar-item-selected-add-above";
    }

    console.error(`unknown toolbarMode: ${toolbarMode}`);
    return "";
}

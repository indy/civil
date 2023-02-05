import { h } from "preact";

import { getAppState, AppStateChange } from '../AppState';
import { svgEdit, svgLinkAlt, svgFlashCard, svgAddAbove } from '../svgIcons';

import { ToolbarMode } from '../types';

// export const TOOLBAR_VIEW = 1;
// export const TOOLBAR_EDIT = 2;
// export const TOOLBAR_REFS = 3;
// export const TOOLBAR_SR = 4;
// export const TOOLBAR_ADD_ABOVE = 5;

export function DeluxeToolbar({}) {
    const appState = getAppState();

    let classes = "deluxe-toolbar";

    if (appState.toolbarMode.value === ToolbarMode.View) {
        classes += " deluxe-toolbar-faded";
    }

    return (<div class={classes}>
        <ToolbarItem toolbarMode={ToolbarMode.Edit} toolbarText="Edit">
            {svgEdit()}
        </ToolbarItem>
        <ToolbarItem toolbarMode={ToolbarMode.Refs} toolbarText="Refs">
            {svgLinkAlt()}
        </ToolbarItem>
        <ToolbarItem toolbarMode={ToolbarMode.SR} toolbarText="SR">
            {svgFlashCard()}
        </ToolbarItem>
        <ToolbarItem toolbarMode={ToolbarMode.AddAbove} toolbarText="Prepend">
            {svgAddAbove()}
        </ToolbarItem>
        </div>);
}

function ToolbarItem({ toolbarMode, toolbarText, children }: { toolbarMode: ToolbarMode, toolbarText: string, children?: any }) {
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

    return (<div class={ classes } onClick={ onClickHandler }>
               { children }
               <span class="toolbar-item-text">{ toolbarText }</span>
            </div>);
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

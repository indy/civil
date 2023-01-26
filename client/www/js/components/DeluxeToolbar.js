import { html } from '/lib/preact/mod.js';

import { getAppState, AppStateChange } from '/js/AppState.js';
import { svgEdit, svgLinkAlt, svgFlashCard, svgAddAbove } from '/js/svgIcons.js';

export const TOOLBAR_VIEW = 1;
export const TOOLBAR_EDIT = 2;
export const TOOLBAR_REFS = 3;
export const TOOLBAR_SR = 4;
export const TOOLBAR_ADD_ABOVE = 5;

export function DeluxeToolbar({}) {
    const appState = getAppState();

    let classes = "deluxe-toolbar";

    if (appState.toolbarMode.value === TOOLBAR_VIEW) {
        classes += " deluxe-toolbar-faded";
    }

    return html`
    <div class=${classes}>
        <${ToolbarItem} toolbarMode=${TOOLBAR_EDIT} toolbarText="Edit">
            ${svgEdit()}
        </${ToolbarItem}>
        <${ToolbarItem} toolbarMode=${TOOLBAR_REFS} toolbarText="Refs">
            ${svgLinkAlt()}
        </${ToolbarItem}>
        <${ToolbarItem} toolbarMode=${TOOLBAR_SR} toolbarText="SR">
            ${svgFlashCard()}
        </${ToolbarItem}>
        <${ToolbarItem} toolbarMode=${TOOLBAR_ADD_ABOVE} toolbarText="Prepend">
            ${svgAddAbove()}
        </${ToolbarItem}>
    </div>
   `;
}

function ToolbarItem({ toolbarMode, toolbarText, children }) {
    const appState = getAppState();

    function onClickHandler(e) {
        if (appState.toolbarMode.value === toolbarMode) {
            // toggle the current mode off
            AppStateChange.toolbarMode(TOOLBAR_VIEW);
        } else {
            AppStateChange.toolbarMode(toolbarMode);
        }
    }

    let classes = "toolbar-item";
    if (toolbarMode === appState.toolbarMode.value) {
        classes += addActiveToolbarClasses(toolbarMode);
    }

    return html`<div class=${ classes } onClick=${ onClickHandler }>
                    ${ children }
                    <span class="toolbar-item-text">${ toolbarText }</span>
                </div>`;
}

export function addActiveToolbarClasses(toolbarMode) {
    switch (toolbarMode) {
    case TOOLBAR_EDIT:
        return " toolbar-item-selected toolbar-item-selected-edit";
    case TOOLBAR_REFS:
        return " toolbar-item-selected toolbar-item-selected-refs";
    case TOOLBAR_SR:
        return " toolbar-item-selected toolbar-item-selected-sr";
    case TOOLBAR_ADD_ABOVE:
        return " toolbar-item-selected toolbar-item-selected-add-above";
    }

    console.error(`unknown toolbarMode: ${toolbarMode}`);
    return "";
}

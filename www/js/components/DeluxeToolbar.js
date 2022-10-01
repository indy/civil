import { html } from '/lib/preact/mod.js';

import { useAppState } from '/js/AppStateProvider.js';
import { AppStateChange, DELUXE_TOOLBAR_VIEW, DELUXE_TOOLBAR_EDIT, DELUXE_TOOLBAR_REFS, DELUXE_TOOLBAR_SR, DELUXE_TOOLBAR_ADD_ABOVE, DELUXE_TOOLBAR_ADD_BELOW } from '/js/AppState.js';
import { svgEdit, svgLinkAlt, svgFlashCard, svgAddAbove, svgAddBelow } from '/js/svgIcons.js';



export default function DeluxeToolbar({}) {
    const appState = useAppState();

    let classes = "deluxe-toolbar";

    if (appState.toolbarMode.value === DELUXE_TOOLBAR_VIEW) {
        classes += " deluxe-toolbar-faded";
    }

    return html`
    <div class=${classes}>
        <${ToolbarItem} toolbarMode=${DELUXE_TOOLBAR_EDIT} toolbarText="Edit">
            ${svgEdit()}
        </${ToolbarItem}>
        <${ToolbarItem} toolbarMode=${DELUXE_TOOLBAR_REFS} toolbarText="Refs">
            ${svgLinkAlt()}
        </${ToolbarItem}>
        <${ToolbarItem} toolbarMode=${DELUXE_TOOLBAR_SR} toolbarText="SR">
            ${svgFlashCard()}
        </${ToolbarItem}>
        <${ToolbarItem} toolbarMode=${DELUXE_TOOLBAR_ADD_ABOVE} toolbarText="Add Above">
            ${svgAddAbove()}
        </${ToolbarItem}>
        <${ToolbarItem} toolbarMode=${DELUXE_TOOLBAR_ADD_BELOW} toolbarText="Add Below">
            ${svgAddBelow()}
        </${ToolbarItem}>
    </div>
   `;
}

function ToolbarItem({ toolbarMode, toolbarText, children }) {
    const appState = useAppState();

    function onClickHandler(e) {
        if (appState.toolbarMode.value === toolbarMode) {
            // toggle the current mode off
            AppStateChange.toolbarMode(DELUXE_TOOLBAR_VIEW);
        } else {
            AppStateChange.toolbarMode(toolbarMode);
        }
    }

    let classes = "toolbar-item";
    if (toolbarMode === appState.toolbarMode.value) {
        classes += " toolbar-item-selected";
    }

    return html`<div class=${ classes } onClick=${ onClickHandler }>
                    ${ children }
                    <span class="toolbar-item-text">${ toolbarText }</span>
                </div>`;
}

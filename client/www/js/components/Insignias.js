import { html } from '/lib/preact/mod.js';

export function InsigniaSelector({ insigniaId, onChange }) {
    const handleInsigniaChange = (event) => {
        onChange(parseInt(event.target.value, 10));
    }

    return html`
        ${ renderInsignia(insigniaId)}
        <label for="insignia-value">
            Insignia value:
            <input type="number" name="insignia-value" id="insignia-value"
onInput=${handleInsigniaChange}
                min="0" max="10" step="1" value="${insigniaId}"/>
        </label>`;
}

export function renderInsignia(insigniaId) {
    switch(insigniaId) {
    case 0:
        return '';
    case 1:
        return svgTwitter();
    case 2:                     // bookmark red
        return svgBookmark("#ff0000");
    case 3:                     // bookmark green
        return svgBookmark("#00ff00");
    case 4:                     // bookmark blue
        return svgBookmark("#0000ff");
    case 5:                     // tag red
        return svgTag("#ff0000");
    case 6:                     // tag green
        return svgTag("#00ff00");
    case 7:                     // tag blue
        return svgTag("#0000ff");
    case 8:
        return svgBell();
    case 9:
        return svgFire();
    case 10:
        return svgHeart();
    default:
        return html``;
    }
}

// https://icons.getbootstrap.com/icons/twitter/
// 1DA1F2 == twitter blue
function svgTwitter() {
    return html`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="16" fill="#1DA1F2" viewBox="1 0 16 16">
  <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z"/>
</svg>`;
}

function svgBookmark(hexColour) {
    return html`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="16" fill="${hexColour}" viewBox="1 0 16 16">
  <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
            </svg>`;
}
function svgTag(hexColour) {
    return html`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="16" fill="${hexColour}" viewBox="1 0 16 16">
  <path d="M2 1a1 1 0 0 0-1 1v4.586a1 1 0 0 0 .293.707l7 7a1 1 0 0 0 1.414 0l4.586-4.586a1 1 0 0 0 0-1.414l-7-7A1 1 0 0 0 6.586 1H2zm4 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
</svg>`;
}

function svgBell() {
    return html`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="16" fill="#ffff00" viewBox="1 0 16 16">
  <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zm.995-14.901a1 1 0 1 0-1.99 0A5.002 5.002 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901z"/>
</svg>`;
}

function svgFire() {
    return html`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="16" fill="#ff0000" viewBox="1 0 16 16">
  <path d="M8 16c3.314 0 6-2 6-5.5 0-1.5-.5-4-2.5-6 .25 1.5-1.25 2-1.25 2C11 4 9 .5 6 0c.357 2 .5 4-2 6-1.25 1-2 2.729-2 4.5C2 14 4.686 16 8 16Zm0-1c-1.657 0-3-1-3-2.75 0-.75.25-2 1.25-3C6.125 10 7 10.5 7 10.5c-.375-1.25.5-3.25 2-3.5-.179 1-.25 2 1 3 .625.5 1 1.364 1 2.25C11 14 9.657 15 8 15Z"/>
</svg>`;
}

function svgHeart() {
    return html`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="16" fill="#ff0000" viewBox="1 0 16 16">
  <path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/>
</svg>`;
}

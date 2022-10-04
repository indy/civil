import { h, html, useState, useEffect, useRef } from '/lib/preact/mod.js';
import { AppStateChange } from '/js/AppState.js';
import { getAppState } from '/js/AppStateProvider.js';
import { svgX } from '/js/svgIcons.js';

export default function Image({ src }) {

    function onClick(e) {
        console.log("clicked on an image");
    }

    return html`<img onClick=${ onClick } src=${ src }/>`
}

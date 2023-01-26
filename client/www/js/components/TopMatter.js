import { Link, html } from '/lib/preact/mod.js';

import { renderInsignia } from '/js/components/Insignias.js';
import LeftMarginHeading from '/js/components/LeftMarginHeading.js';
import Title from '/js/components/Title.js';

export default function TopMatter({ title,
                                    deck,
                                    isShowingUpdateForm,
                                    isEditingDeckRefs,
                                    onRefsToggle,
                                    onFormToggle,
                                    children}) {
    if (!deck) {
        return html`<div></div>`;
    }

    return html`
    <div>
        <div class="left-margin">
            <${LeftMarginHeading}>
                ${renderInsignia(deck.insignia)}
            </${LeftMarginHeading}>
            ${children}
        </div>
        <${Title} title=${ title }
                  isShowingUpdateForm=${ isShowingUpdateForm }
                  isEditingDeckRefs=${ isEditingDeckRefs }
                  onRefsToggle=${ onRefsToggle }
                  onFormToggle=${ onFormToggle }/>
    </div>`;
}

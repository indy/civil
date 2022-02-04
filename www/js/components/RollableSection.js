import { html, useState } from '/lib/preact/mod.js';
import { svgChevronDoubleDown, svgChevronDoubleRight} from '/js/svgIcons.js';

export default function RollableSection({ heading, children, initiallyRolledUp }) {
    let [isRolledUp, setIsRolledUp] = useState(!!initiallyRolledUp);

    function onRollClicked(e) {
        e.preventDefault();
        setIsRolledUp(!isRolledUp);
    }

    let classState = isRolledUp ? "rolled-up" : "rolled-down";
    let icon = isRolledUp ? svgChevronDoubleRight() : svgChevronDoubleDown();

    return html`
    <section class=${classState}>
      <div>
        <div class="left-margin">
          <div class="left-margin-entry clickable" onClick=${ onRollClicked }>
            ${ icon }
          </div>
        </div>
        <h2 class="clickable" onClick=${ onRollClicked }>${ heading }</h2>
        <hr class="big-section"/>
        ${ !isRolledUp && children }
      </div>
    </section>`;
}

import { html, useState } from '/js/ext/library.js';
import { svgChevronDoubleDown, svgChevronDoubleRight} from '/js/lib/svgIcons.js';

export default function RollableSection({ heading, children }) {
  let [isRolledDown, setIsRolledDown] = useState(true);

  function onRollClicked(e) {
    e.preventDefault();
    setIsRolledDown(!isRolledDown);
  }

  let classState = isRolledDown ? "rolled-down" : "rolled-up";
  let icon = isRolledDown ? svgChevronDoubleDown() : svgChevronDoubleRight();

  return html`
    <section class=${classState}>
      <div>
        <div class="spanne">
          <div class="spanne-entry spanne-clickable" onClick=${ onRollClicked }>
            ${ icon }
          </div>
        </div>
        <h2>${ heading }</h2>
        ${ isRolledDown && children }
      </div>
    </section>`;
}

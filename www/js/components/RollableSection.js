import { html, useState } from '/js/ext/library.js';
import { svgChevronDoubleDown, svgChevronDoubleUp} from '/js/lib/svgIcons.js';

export default function RollableSection({ heading, children }) {
  let [isRolledDown, setIsRolledDown] = useState(true);

  function onRollClicked(e) {
    e.preventDefault();
    setIsRolledDown(!isRolledDown);
  }

  return html`
    <section>
      <div>
        <div class="spanne">
          <div class="spanne-entry spanne-clickable" onClick=${ onRollClicked }>
            ${ isRolledDown ? svgChevronDoubleDown() : svgChevronDoubleUp() }
          </div>
        </div>
        <h2>${ heading }</h2>
        ${ isRolledDown && children }
      </div>
    </section>`;
}

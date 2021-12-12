import { h, html, Link, useState } from '/lib/preact/mod.js';

export default function DeleteConfirmation({ onDelete }) {

  const [showToggle, setShowToggle] = useState(false);

  function buttonClicked(e) {
    e.preventDefault();
    setShowToggle(true);
  }

  function noClicked(e) {
    e.preventDefault();
    setShowToggle(false);
  }

  function yesClicked(e) {
    e.preventDefault();
    setShowToggle(false);
    onDelete();
  }

  return html`<span>
                ${!showToggle && html`<button onClick=${ buttonClicked }>Delete...</button>`}
                ${showToggle && html`<button onClick=${ noClicked }>No, Cancel Delete</button>`}
                ${showToggle && html`<button onClick=${ yesClicked }>Yes, Really Delete</button>`}
              </span>`;
}

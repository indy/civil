import { h, html, Link, useState, useEffect } from '/lib/preact/mod.js';

export default function YesNoConfirmation({ buttonText, yesText, noText, onYes }) {

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
    onYes();
  }

  return html`<span>
                ${!showToggle && html`<button onClick=${ buttonClicked }>${ buttonText }</button>`}
                ${showToggle && html`<button onClick=${ noClicked }>${ noText }</button>`}
                ${showToggle && html`<button onClick=${ yesClicked }>${ yesText }</button>`}
              </span>`;
}

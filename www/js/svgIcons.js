// svg icons are from https://icons.mono.company
// old ones were from https://github.com/tabler/tabler-icons

// tidy up svg with: https://yqnn.github.io/svg-path-editor/

import { html } from '/lib/preact/mod.js';

const svgColour = "#666";
const svgColourAlt = "#ccc";

export function svgBlank() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24"></svg>`;
}

export function svgTickedCheckBox() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M 1 1 L 1 23 L 23 23 L 23 1 Z M 3 3 L 3 21 L 21 21 L 21 3 Z
M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L12 10.5858L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 6.31658 18.7071 6.70711L13.4142 12L18.7071 17.2929C19.0976 17.6834 19.0976 18.3166 18.7071 18.7071C18.3166 19.0976 17.6834 19.0976 17.2929 18.7071L12 13.4142L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071C4.90237 18.3166 4.90237 17.6834 5.29289 17.2929L10.5858 12L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z" fill="${svgColour}"></path>
</svg>`;
}

// scaled by 0.8 and then translates down by 4 or 5
export function svgRatingStar() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M 9.6 8 C 9.903 8 10.18 8.1712 10.3155 8.4422 L 12.3786 12.5685 L 16.9151 13.2283 C 17.2165 13.2722 17.4668 13.4832 17.5609 13.7728 C 17.655 14.0624 17.5765 14.3802 17.3585 14.5928 L 14.0568 17.8119 L 14.7995 22.3508 C 14.8486 22.6508 14.7234 22.9526 14.4765 23.1299 C 14.2296 23.3071 13.9035 23.3291 13.635 23.1867 L 9.6 21.0457 L 5.565 23.1867 C 5.2965 23.3291 4.9704 23.3071 4.7235 23.1299 C 4.4766 22.9526 4.3514 22.6508 4.4005 22.3508 L 5.1432 17.8119 L 1.8415 14.5928 C 1.6235 14.3802 1.5451 14.0624 1.6392 13.7728 C 1.7332 13.4832 1.9835 13.2722 2.2848 13.2283 L 6.8213 12.5685 L 8.8845 8.4422 C 9.02 8.1712 9.297 8 9.6 8 Z M 9.6 10.5889 L 8.0655 13.6578 C 7.9485 13.8919 7.7242 14.054 7.4652 14.0917 L 4.1187 14.5784 L 6.5585 16.9572 C 6.7454 17.1394 6.8317 17.4015 6.7895 17.6592 L 6.24 21.0172 L 9.225 19.4334 C 9.4595 19.3089 9.7405 19.3089 9.975 19.4334 L 12.96 21.0172 L 12.4105 17.6592 C 12.3683 17.4015 12.4546 17.1394 12.6415 16.9572 L 15.0813 14.5784 L 11.7349 14.0917 C 11.4758 14.054 11.2515 13.8919 11.1345 13.6578 L 9.6 10.5889 Z" fill="${svgColour}"></path>
</svg>`;
}

export function svgUntickedCheckBox() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M 1 1 L 1 23 L 23 23 L 23 1 Z M 3 3 L 3 21 L 21 21 L 21 3 Z" fill="${svgColour}"></path>
</svg>`;
}

export function svgChevronLeft() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M14.7071 5.29289C15.0976 5.68342 15.0976 6.31658 14.7071 6.70711L9.41421 12L14.7071 17.2929C15.0976 17.6834 15.0976 18.3166 14.7071 18.7071C14.3166 19.0976 13.6834 19.0976 13.2929 18.7071L7.29289 12.7071C6.90237 12.3166 6.90237 11.6834 7.29289 11.2929L13.2929 5.29289C13.6834 4.90237 14.3166 4.90237 14.7071 5.29289Z" fill="${svgColour}"></path>
</svg>`;
}

export function svgChevronRight() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M9.29289 18.7071C8.90237 18.3166 8.90237 17.6834 9.29289 17.2929L14.5858 12L9.29289 6.70711C8.90237 6.31658 8.90237 5.68342 9.29289 5.29289C9.68342 4.90237 10.3166 4.90237 10.7071 5.29289L16.7071 11.2929C17.0976 11.6834 17.0976 12.3166 16.7071 12.7071L10.7071 18.7071C10.3166 19.0976 9.68342 19.0976 9.29289 18.7071Z" fill="${svgColour}"></path>
</svg>`;
}

export function svgEdit() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M16.2929 2.29289C16.6834 1.90237 17.3166 1.90237 17.7071 2.29289L21.7071 6.29289C22.0976 6.68342 22.0976 7.31658 21.7071 7.70711L8.70711 20.7071C8.51957 20.8946 8.26522 21 8 21H4C3.44772 21 3 20.5523 3 20V16C3 15.7348 3.10536 15.4804 3.29289 15.2929L13.2927 5.2931L16.2929 2.29289ZM14 7.41421L5 16.4142V19H7.58579L16.5858 10L14 7.41421ZM18 8.58579L15.4142 6L17 4.41421L19.5858 7L18 8.58579Z" fill="${svgColour}"></path>
</svg>`;
}

export function svgCancel() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L12 10.5858L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 6.31658 18.7071 6.70711L13.4142 12L18.7071 17.2929C19.0976 17.6834 19.0976 18.3166 18.7071 18.7071C18.3166 19.0976 17.6834 19.0976 17.2929 18.7071L12 13.4142L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071C4.90237 18.3166 4.90237 17.6834 5.29289 17.2929L10.5858 12L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z" fill="${svgColour}"></path>
</svg>`;
}

export function svgImage() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M2.99998 5C2.99998 3.89543 3.89541 3 4.99998 3H19C20.1045 3 21 3.89543 21 5V19C21 20.1046 20.1045 21 19 21H4.99998C3.89541 21 2.99998 20.1046 2.99998 19V5ZM19 5H4.99998V19H19V5Z" fill="${svgColour}"></path>
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M8.37528 10.2191C8.7405 9.92696 9.25945 9.92696 9.62467 10.2191L13.9258 13.66L15.2929 12.2929C15.6834 11.9024 16.3166 11.9024 16.7071 12.2929L20.7071 16.2929C21.0976 16.6834 21.0976 17.3166 20.7071 17.7071C20.3166 18.0976 19.6834 18.0976 19.2929 17.7071L16 14.4142L14.7071 15.7071C14.3468 16.0674 13.7732 16.0992 13.3753 15.7809L8.99998 12.2806L4.62467 15.7809C4.19341 16.1259 3.56412 16.056 3.21911 15.6247C2.8741 15.1934 2.94402 14.5641 3.37528 14.2191L8.37528 10.2191Z" fill="${svgColour}"></path>
<path xmlns="http://www.w3.org/2000/svg" d="M17 8.5C17 9.32843 16.3284 10 15.5 10C14.6715 10 14 9.32843 14 8.5C14 7.67157 14.6715 7 15.5 7C16.3284 7 17 7.67157 17 8.5Z" fill="${svgColour}"></path>
</svg>`;
}

export function svgExpand() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M12 4C12.5523 4 13 4.44772 13 5V11H19C19.5523 11 20 11.4477 20 12C20 12.5523 19.5523 13 19 13H13V19C13 19.5523 12.5523 20 12 20C11.4477 20 11 19.5523 11 19V13H5C4.44772 13 4 12.5523 4 12C4 11.4477 4.44772 11 5 11H11V5C11 4.44772 11.4477 4 12 4Z" fill="${svgColour}"></path>
</svg>`;
}

export function svgMinimise() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M4 12C4 11.4477 4.44772 11 5 11H19C19.5523 11 20 11.4477 20 12C20 12.5523 19.5523 13 19 13H5C4.44772 13 4 12.5523 4 12Z" fill="${svgColour}"></path>
</svg>`;
}

// document-add
export function svgPointAdd() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M4 4C4 2.89543 4.89543 2 6 2H14C14.2652 2 14.5196 2.10536 14.7071 2.29289L19.7071 7.29289C19.8946 7.48043 20 7.73478 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V4ZM17.5858 8H14V4.41421L17.5858 8ZM12 4V9C12 9.55228 12.4477 10 13 10H18V20H6V4L12 4ZM12 12C12.5523 12 13 12.4477 13 13V14H14C14.5523 14 15 14.4477 15 15C15 15.5523 14.5523 16 14 16H13V17C13 17.5523 12.5523 18 12 18C11.4477 18 11 17.5523 11 17V16H10C9.44772 16 9 15.5523 9 15C9 14.4477 9.44772 14 10 14H11V13C11 12.4477 11.4477 12 12 12Z" fill="${svgColour}"></path>
</svg>`;
}

export function svgCircleArrowDown() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM12 6C12.5523 6 13 6.44772 13 7V14.5858L15.2929 12.2929C15.6834 11.9024 16.3166 11.9024 16.7071 12.2929C17.0976 12.6834 17.0976 13.3166 16.7071 13.7071L12.7071 17.7071C12.3166 18.0976 11.6834 18.0976 11.2929 17.7071L7.29289 13.7071C6.90237 13.3166 6.90237 12.6834 7.29289 12.2929C7.68342 11.9024 8.31658 11.9024 8.70711 12.2929L11 14.5858V7C11 6.44772 11.4477 6 12 6Z" fill="${svgColour}"></path></svg>`;
}

export function svgCircleArrowUp() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM11 9.41421L8.70711 11.7071C8.31658 12.0976 7.68342 12.0976 7.29289 11.7071C6.90237 11.3166 6.90237 10.6834 7.29289 10.2929L11.2929 6.29289C11.6834 5.90237 12.3166 5.90237 12.7071 6.29289L16.7071 10.2929C17.0976 10.6834 17.0976 11.3166 16.7071 11.7071C16.3166 12.0976 15.6834 12.0976 15.2929 11.7071L13 9.41421V17C13 17.5523 12.5523 18 12 18C11.4477 18 11 17.5523 11 17V9.41421Z" fill="${svgColour}"></path></svg>`;
}

export function svgChevronDoubleUp() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M11.2929 4.29289C11.6834 3.90237 12.3166 3.90237 12.7071 4.29289L18.7071 10.2929C19.0976 10.6834 19.0976 11.3166 18.7071 11.7071C18.3166 12.0976 17.6834 12.0976 17.2929 11.7071L12 6.41421L6.70711 11.7071C6.31658 12.0976 5.68342 12.0976 5.29289 11.7071C4.90237 11.3166 4.90237 10.6834 5.29289 10.2929L11.2929 4.29289ZM12 12.4142L6.70711 17.7071C6.31658 18.0976 5.68342 18.0976 5.29289 17.7071C4.90237 17.3166 4.90237 16.6834 5.29289 16.2929L11.2929 10.2929C11.6834 9.90237 12.3166 9.90237 12.7071 10.2929L18.7071 16.2929C19.0976 16.6834 19.0976 17.3166 18.7071 17.7071C18.3166 18.0976 17.6834 18.0976 17.2929 17.7071L12 12.4142Z" fill="${svgColour}"></path>
</svg>`;
}

export function svgChevronDoubleDown() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M5.29289 6.29289C5.68342 5.90237 6.31658 5.90237 6.70711 6.29289L12 11.5858L17.2929 6.2929C17.6834 5.90237 18.3166 5.90237 18.7071 6.2929C19.0976 6.68342 19.0976 7.31658 18.7071 7.70711L12.7071 13.7071C12.3166 14.0976 11.6834 14.0976 11.2929 13.7071L5.29289 7.70711C4.90237 7.31658 4.90237 6.68342 5.29289 6.29289ZM5.29289 12.2929C5.68342 11.9024 6.31658 11.9024 6.70711 12.2929L12 17.5858L17.2929 12.2929C17.6834 11.9024 18.3166 11.9024 18.7071 12.2929C19.0976 12.6834 19.0976 13.3166 18.7071 13.7071L12.7071 19.7071C12.3166 20.0976 11.6834 20.0976 11.2929 19.7071L5.29289 13.7071C4.90237 13.3166 4.90237 12.6834 5.29289 12.2929Z" fill="${svgColour}"></path></svg>`;
}

export function svgChevronDoubleRight() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M12.2929 5.29289C12.6834 4.90237 13.3166 4.90237 13.7071 5.29289L19.7071 11.2929C20.0976 11.6834 20.0976 12.3166 19.7071 12.7071L13.7071 18.7071C13.3166 19.0976 12.6834 19.0976 12.2929 18.7071C11.9024 18.3166 11.9024 17.6834 12.2929 17.2929L17.5858 12L12.2929 6.70711C11.9024 6.31658 11.9024 5.68342 12.2929 5.29289ZM6.29289 5.29289C6.68342 4.90237 7.31658 4.90237 7.70711 5.29289L13.7071 11.2929C13.8946 11.4804 14 11.7348 14 12C14 12.2652 13.8946 12.5196 13.7071 12.7071L7.70711 18.7071C7.31658 19.0976 6.68342 19.0976 6.29289 18.7071C5.90237 18.3166 5.90237 17.6834 6.29289 17.2929L11.5858 12L6.29289 6.70711C5.90237 6.31658 5.90237 5.68342 6.29289 5.29289Z" fill="${svgColour}"></path>
</svg>`;
}

export function svgCaretDown() {
  return html `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" d="M17 18L12 24L7 18H17Z" fill="${svgColour}"></path></svg>`;
}

export function svgCaretUp() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" d="M7 22L12 16L17 22L7 22Z" fill="${svgColour}"></path></svg>`;
}

export function svgCaretRight() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" d="M10 14L16 19L10 24L10 14Z" fill="${svgColour}"></path></svg>`;
}

export function svgCaretRightEmpty() {
  return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" d="M10 14L16 19L10 24L10 14Z" fill="${svgColourAlt}"></path></svg>`;
}

import { html, useState, useEffect, useRef } from '/js/ext/library.js';
import { useStateValue } from '/js/lib/StateProvider.js';

import Net from '/js/lib/Net.js';

export default function ImageWidget(props) {
  const [state, dispatch] = useStateValue();
  const [minimised, setMinimised] = useState(true);

  const [hovering, setHovering] = useState(false);

  const dragArea = useRef(null);

  const imageDirectory = state.imageDirectory;

  useEffect(() => {
    if (dragArea && dragArea.current) {
      const dragAreaElement = dragArea.current;
      // console.log('adding event listeners');
      dragAreaElement.addEventListener("dragenter", dragEnter, false);
      dragAreaElement.addEventListener("dragleave", dragLeave, false);
      dragAreaElement.addEventListener("dragover", dragOver, false);
      dragAreaElement.addEventListener("drop", drop, false);
      return () => {
        // console.log('removing event listeners');
        dragAreaElement.removeEventListener("dragenter", dragEnter);
        dragAreaElement.removeEventListener("dragleave", dragLeave);
        dragAreaElement.removeEventListener("dragover", dragOver);
        dragAreaElement.removeEventListener("drop", drop);
      }
    }
  });

  function handleFiles(files) {
    let counter = 0;
    let formData = new FormData();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.type.startsWith('image/')) {
        formData.append("file" + counter, file);
        counter += 1;
      }
    }

    if (counter > 0) {
      let options = {
        method: "POST",
        body: formData
      };
      // post the image data
      fetch("/api/upload", options).then(resp => {
        // fetch the most recent uploads
        Net.get("/api/upload").then(recentImages => {
          dispatch({
            type: 'setRecentImages',
            recentImages
          });
        });
      });
    }
  }

  function dragEnter(e) {
    e.stopPropagation();
    e.preventDefault();
    setHovering(true);
  }

  function dragLeave(e) {
    e.stopPropagation();
    e.preventDefault();
    setHovering(false);
  }

  function dragOver(e) {
    e.stopPropagation();
    e.preventDefault();
  }

  function drop(e) {
    e.stopPropagation();
    e.preventDefault();

    const dt = e.dataTransfer;
    const files = dt.files;

    handleFiles(files);

    setHovering(false);
  }

  function onIconClicked() {
    setMinimised(!minimised);
  }

  if (minimised) {
    return expandIcon(onIconClicked);
  } else {

    const recent = state.recentImages.map(ri => html`<${ImageWidgetItem}
                                                       imageDirectory=${imageDirectory}
                                                       filename=${ri.filename}/>`);

    let containerClass = "";
    if (hovering) {
      containerClass += " image-widget-hovering";
    }
    containerClass += " image-widget-container";

    const dragdropMessage = html`<div class="image-widget-hover-message">Drop Images Here</div>`;

    return html`
             <div>
               ${ retractIcon(onIconClicked) }
               <div class="${containerClass}" ref=${dragArea}>
                 ${ hovering ? dragdropMessage : recent }
               </div>
             </div>`;
  }
}

function ImageWidgetItem({ filename, imageDirectory }) {
  return html`
<div class="image-widget-item">
  <img class="image-widget-img" src="/u/${imageDirectory}/${filename}"/>
  <div class="image-widget-title">@img(${filename})</div>
</div>`;
}

function expandIcon(onIconClicked) {
    return html`
  <div class="spanne">
    <div class="spanne-entry">
<svg class="console-toggle-icon" onClick=${ onIconClicked } xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M2.99998 5C2.99998 3.89543 3.89541 3 4.99998 3H19C20.1045 3 21 3.89543 21 5V19C21 20.1046 20.1045 21 19 21H4.99998C3.89541 21 2.99998 20.1046 2.99998 19V5ZM19 5H4.99998V19H19V5Z" fill="#666"></path>
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M8.37528 10.2191C8.7405 9.92696 9.25945 9.92696 9.62467 10.2191L13.9258 13.66L15.2929 12.2929C15.6834 11.9024 16.3166 11.9024 16.7071 12.2929L20.7071 16.2929C21.0976 16.6834 21.0976 17.3166 20.7071 17.7071C20.3166 18.0976 19.6834 18.0976 19.2929 17.7071L16 14.4142L14.7071 15.7071C14.3468 16.0674 13.7732 16.0992 13.3753 15.7809L8.99998 12.2806L4.62467 15.7809C4.19341 16.1259 3.56412 16.056 3.21911 15.6247C2.8741 15.1934 2.94402 14.5641 3.37528 14.2191L8.37528 10.2191Z" fill="#666"></path>
<path xmlns="http://www.w3.org/2000/svg" d="M17 8.5C17 9.32843 16.3284 10 15.5 10C14.6715 10 14 9.32843 14 8.5C14 7.67157 14.6715 7 15.5 7C16.3284 7 17 7.67157 17 8.5Z" fill="#666"></path>
</svg>
    </div>
  </div>
  `;
}

// svg icons are from https://icons.mono.company
// (old ones were from https://github.com/tabler/tabler-icons)
function retractIcon(onIconClicked) {
    return html`
  <div class="spanne">
    <div class="spanne-entry">
<svg class="console-toggle-icon" onClick=${ onIconClicked } xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
<path xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" d="M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L12 10.5858L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 6.31658 18.7071 6.70711L13.4142 12L18.7071 17.2929C19.0976 17.6834 19.0976 18.3166 18.7071 18.7071C18.3166 19.0976 17.6834 19.0976 17.2929 18.7071L12 13.4142L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071C4.90237 18.3166 4.90237 17.6834 5.29289 17.2929L10.5858 12L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z" fill="#666"></path>
</svg>
    </div>
  </div>
  `;
}

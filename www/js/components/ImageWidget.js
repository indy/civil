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
    let hasImageFiles = false;
    let formData = new FormData();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.type.startsWith('image/')) {
        hasImageFiles = true;
        formData.append("file", file);
      }
    }

    if (hasImageFiles) {
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
    return html`
             <div>
               ${ expandIcon(onIconClicked) }
             </div>
`;
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
               <hr/>
               <div class="${containerClass}" ref=${dragArea}>
                 ${ hovering ? dragdropMessage : recent }
               </div>
               <hr/>
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
    <div class="">
      <svg class="console-toggle-icon" onClick=${ onIconClicked } xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="#666" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z"/>
        <line x1="20" y1="12" x2="10" y2="12" />
        <line x1="20" y1="12" x2="16" y2="16" />
        <line x1="20" y1="12" x2="16" y2="8" />
        <line x1="4" y1="4" x2="4" y2="20" />

      </svg>
    </div>
  `;
}

// svg icons are from https://github.com/tabler/tabler-icons
function retractIcon(onIconClicked) {
    return html`
    <div class="">
      <svg class="console-toggle-icon" onClick=${ onIconClicked } xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="#666" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z"/>
        <line x1="4" y1="12" x2="14" y2="12" />
        <line x1="4" y1="12" x2="8" y2="16" />
        <line x1="4" y1="12" x2="8" y2="8" />
        <line x1="20" y1="4" x2="20" y2="20" />
      </svg>
    </div>
  `;
}

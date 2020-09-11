import { html, useState, useEffect, useRef } from '/js/ext/library.js';
import { useStateValue } from '/js/lib/StateProvider.js';

import Net from '/js/lib/Net.js';

export default function ImageWidget(props) {
  const [state, dispatch] = useStateValue();
  const [minimised, setMinimised] = useState(true);

  const uploadForm = useRef(null);

  const imageDirectory = state.imageDirectory;
  /*
  const dragArea = useRef(null);

  useEffect(() => {
    if (dragArea && dragArea.current) {
      const dragAreaElement = dragArea.current;
      // console.log('adding event listeners');
      dragAreaElement.addEventListener("dragenter", dragEnter, false);
      dragAreaElement.addEventListener("dragover", dragOver, false);
      dragAreaElement.addEventListener("drop", drop, false);
      return () => {
        // console.log('removing event listeners');
        dragAreaElement.removeEventListener("dragenter", dragEnter);
        dragAreaElement.removeEventListener("dragover", dragOver);
        dragAreaElement.removeEventListener("drop", drop);
      }
    }
  });
  */


  function go(url, data) {
    let options = {
      method: "POST",
      body: data
    };

    return fetch(url, options);
  }


  function onIconClicked() {
    setMinimised(!minimised);
  }

  function submitHandler(e) {
    e.preventDefault();

    if (uploadForm && uploadForm.current) {
      let formData = new FormData(uploadForm.current);

      if (formData.has("file") && formData.get("file") !== "") {

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
      } else {
        // console.log("no file given, just the 'upload images' button was clicked");
      }
    }
  }

  if (minimised) {
  return html`
           <div>
             ${ expandIcon(onIconClicked) }
           </div>
`;
  } else {
  const recent = state.recentImages.map(ri => html`<${ImageWidgetItem} imageDirectory=${imageDirectory} filename=${ri.filename}/>`);
  return html`
           <div>
             ${ retractIcon(onIconClicked) }
             <div class="image-widget-container">
               ${recent}
             </div>
             <form ref=${uploadForm}>
               <input type="file" multiple name="file"/>
               <button onClick=${submitHandler}>Upload Images</button>
             </form>
           </div>`;
  }
}

function FileUpload(/*img, */file) {

  console.log("FileUpload invoked");

  const reader = new FileReader();
  // this.ctrl = createThrobber(img);
  const xhr = new XMLHttpRequest();
  this.xhr = xhr;

  // const self = this;
  // this.xhr.upload.addEventListener("progress", function(e) {
  //       if (e.lengthComputable) {
  //         const percentage = Math.round((e.loaded * 100) / e.total);
  //         self.ctrl.update(percentage);
  //       }
  //     }, false);

  // xhr.upload.addEventListener("load", function(e){
  //         self.ctrl.update(100);
  //         const canvas = self.ctrl.ctx.canvas;
  //         canvas.parentNode.removeChild(canvas);
  //     }, false);

  xhr.open("POST", "http://localhost:3002/api/upload");
  xhr.overrideMimeType('text/plain; charset=x-user-defined-binary');
  reader.onload = function(evt) {
    console.log("FileUpload reader.onload");
    xhr.send(evt.target.result);
  };
  reader.readAsBinaryString(file);
}

function handleFiles(files) {
  console.log(files);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    console.log(file);
    // File { name: "WsOQuk.png", lastModified: 1593370115000, webkitRelativePath: "", size: 7757, type: "image/png" }


    if (!file.type.startsWith('image/')){ continue; }

    new FileUpload(file);
    /*
    const img = document.createElement("img");
    img.classList.add("obj");
    img.file = file;
    preview.appendChild(img); // Assuming that "preview" is the div output where the content will be displayed.

    const reader = new FileReader();
    reader.onload = (function(aImg) { return function(e) { aImg.src = e.target.result; }; })(img);
    reader.readAsDataURL(file);
    */
  }
}

function dragEnter(e) {
  e.stopPropagation();
  e.preventDefault();
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
}


function ImageWidgetItem({ filename, imageDirectory }) {
  return html`
<div class="image-widget-item">
  <img class="image-widget-img" src="/img/u/${imageDirectory}/${filename}"/>
  <div class="image-widget-title">${filename}</div>
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

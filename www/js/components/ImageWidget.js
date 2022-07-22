import { h, html, useState, useEffect, useRef } from '/lib/preact/mod.js';
import { useStateValue } from '/js/StateProvider.js';
import { svgX, svgImage } from '/js/svgIcons.js';

import Net from '/js/Net.js';

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

    function onIconClicked(e) {
        e.preventDefault();
        setMinimised(!minimised);
    }

    if (minimised) {
        return h('button',
                 {
                     onClick: onIconClicked
                 },
                 "Images...");
    } else {
        const recent = state.recentImages.map(ri => h(ImageWidgetItem,
                                                      {
                                                          imageDirectory: imageDirectory,
                                                          filename: ri.filename
                                                      }));

        let containerClass = "image-widget-container";
        if (hovering) {
            containerClass += " image-widget-hovering";
        }

        const dragdropMessage = h("div", { class: "image-widget-hover-message" }, "Drop Images Here");

        return html`
        <div>
            <div class="left-margin">
                <div class="left-margin-entry" onClick=${ onIconClicked }>
                    ${ svgX() }
                </div>
            </div>
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
        <div class="image-widget-title">#img(${filename})</div>
    </div>`;
}

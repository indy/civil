import { h } from "preact";
import { useEffect, useState, useRef } from "preact/hooks";

import { UserUploadedImage } from "types";

import Net from "net";
import { getAppState, AppStateChange } from "app-state";
import { svgX } from "../svg-icons";

type Props = {
    onPaste: (s: string) => void;
};

export default function ImageSelector({ onPaste }: Props) {
    const appState = getAppState();
    const [minimised, setMinimised] = useState(true);

    const [hovering, setHovering] = useState(false);

    const dragArea = useRef(null);

    const imageDirectory = appState.imageDirectory.value;

    useEffect(() => {
        if (dragArea && dragArea.current) {
            const dragAreaElement = dragArea.current as HTMLElement;
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
            };
        }

        // fake: fix for typescript error todo: check this code
        return () => {};
    });

    function handleFiles(files: FileList) {
        let counter = 0;
        let formData = new FormData();

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            if (file.type.startsWith("image/")) {
                formData.append("file" + counter, file);
                counter += 1;
            }
        }

        if (counter > 0) {
            let options = {
                method: "POST",
                body: formData,
            };
            // post the image data
            fetch("/api/upload", options).then((resp) => {
                // fetch the most recent uploads
                Net.get<Array<UserUploadedImage>>("/api/upload").then(
                    (recentImages) => {
                        AppStateChange.setRecentImages(recentImages);
                    }
                );
            });
        }
    }

    function dragEnter(e: Event) {
        e.stopPropagation();
        e.preventDefault();
        setHovering(true);
    }

    function dragLeave(e: Event) {
        e.stopPropagation();
        e.preventDefault();
        setHovering(false);
    }

    function dragOver(e: Event) {
        e.stopPropagation();
        e.preventDefault();
    }

    function drop(e: InputEvent) {
        e.stopPropagation();
        e.preventDefault();

        const dt = e.dataTransfer;
        if (dt) {
            const files = dt.files;

            handleFiles(files);
        }
        setHovering(false);
    }

    function onIconClicked(e: Event) {
        e.preventDefault();
        setMinimised(!minimised);
    }

    if (minimised) {
        return h(
            "button",
            {
                onClick: onIconClicked,
            },
            "Images..."
        );
    } else {
        const recent = appState.recentImages.value.map((ri) =>
            h(ImageSelectorItem, {
                imageDirectory: imageDirectory,
                filename: ri.filename,
                onPaste: onPaste,
            })
        );

        let containerClass = "image-widget-container";
        if (hovering) {
            containerClass += " image-widget-hovering";
        }

        const dragdropMessage = h(
            "div",
            { class: "image-widget-hover-message" },
            "Drop Images Here"
        );

        return (
            <div>
                <div class="left-margin">
                    <div class="left-margin-entry" onClick={onIconClicked}>
                        {svgX()}
                    </div>
                </div>
                <div class={containerClass} ref={dragArea}>
                    {hovering ? dragdropMessage : recent}
                </div>
            </div>
        );
    }
}

function ImageSelectorItem({ filename, imageDirectory, onPaste }) {
    let markupSyntax = `:img(${filename})`;

    function onClick() {
        onPaste && onPaste(markupSyntax);
    }

    const srcPath = `/u/${imageDirectory}/${filename}`;

    return (
        <div class="image-widget-item">
            <img class="image-widget-img" onClick={onClick} src={srcPath} />
            <div class="image-widget-title">{markupSyntax}</div>
        </div>
    );
}

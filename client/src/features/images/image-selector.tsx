import { h } from "preact";
import { useState, useRef } from "preact/hooks";

import { UserUploadedImage } from "types";

import { AppStateChange } from "app-state";

import uploadImages from "features/images/image-upload";

import { getAppState } from "app-state";
import { svgX } from "components/svg-icons";

import useDragDrop from "components/use-drag-drop";

type Props = {
    onPaste: (s: string) => void;
};

export default function ImageSelector({ onPaste }: Props) {
    const appState = getAppState();
    const [minimised, setMinimised] = useState(true);

    const [hovering, setHovering] = useState(false);

    const dragArea = useRef(null);

    async function droppedFiles(files: FileList) {
        let recentImages: Array<UserUploadedImage> = await uploadImages(files);
        AppStateChange.setRecentImages(recentImages);
    }

    useDragDrop(dragArea, droppedFiles, setHovering);

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
                imageDirectory: appState.imageDirectory.value,
                filename: ri.filename,
                onPaste: onPaste,
            })
        );

        let containerClass = "image-widget-container";
        if (hovering) {
            containerClass += " image-widget-hovering drop-target";
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

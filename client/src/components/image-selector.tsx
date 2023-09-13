import { h } from "preact";
import { useRef, useState } from "preact/hooks";

import { UserUploadedImage } from "../types";

import { AppStateChange, getAppState } from "../app-state";

import CivilButton from "./civil-button";
import { CivLeft } from "./civil-layout";
import uploadImages from "./image-upload";
import { svgX } from "./svg-icons";
import useDragDrop from "./use-drag-drop";

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
        AppStateChange.setRecentImages({ recentImages });
    }

    useDragDrop(dragArea, droppedFiles, setHovering);

    function onIconClicked() {
        setMinimised(!minimised);
    }

    if (minimised) {
        return <CivilButton onClick={onIconClicked}>Images...</CivilButton>;
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
                <CivLeft>
                    <div class="left-margin-entry" onClick={onIconClicked}>
                        {svgX()}
                    </div>
                </CivLeft>
                <div class={containerClass} ref={dragArea}>
                    {hovering ? dragdropMessage : recent}
                </div>
            </div>
        );
    }
}

type ImageSelectorItemProps = {
    filename: string;
    imageDirectory: string;
    onPaste: (s: string) => void;
};

function ImageSelectorItem({
    filename,
    imageDirectory,
    onPaste,
}: ImageSelectorItemProps) {
    let markupSyntax = `:img(${filename})`;

    function onClick() {
        onPaste && onPaste(markupSyntax);
    }

    const srcPath = `/u/${imageDirectory}/${filename}`;

    return (
        <div class="image-widget-item">
            <img class="image-widget-img" onClick={onClick} src={srcPath} />
            <div class="image-widget-title ui">{markupSyntax}</div>
        </div>
    );
}

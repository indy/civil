import type { RefObject } from "preact";
import { useState } from "preact/hooks";

import type { UserUploadedImage } from "../types";

import { AppStateChange } from "../app-state";

import { CivRight } from "./civil-layout";
import uploadImages from "./image-upload";
import useDragDrop from "./use-drag-drop";
import HelpMarkupSyntax from "./help-markup-syntax";

type Props = {
    id?: string;
    value: string;
    elementRef?: RefObject<HTMLTextAreaElement>;
    elementClass?: string;
    onFocus?: () => void;
    onBlur?: (e?: Event) => void;
    onPaste?: (s: string) => void;
    onContentChange?: (s: string) => void;
};

export default function CivilTextArea({
    id,
    value,
    elementRef,
    elementClass,
    onFocus,
    onBlur,
    onPaste,
    onContentChange,
}: Props) {
    const [hovering, setHovering] = useState(false);
    useDragDrop(elementRef, droppedFiles, setHovering);

    async function droppedFiles(files: FileList) {
        const numImages = files.length;
        // upload the images
        const recentImages: Array<UserUploadedImage> = await uploadImages(
            files,
        );
        // update the recent images list
        AppStateChange.setRecentImages({ recentImages });
        // update the markup with the correct image filenames
        if (onPaste) {
            let markup = "";
            for (let i = 0; i < numImages; i++) {
                markup += ":img(" + recentImages[i]!.filename + ") ";
            }
            onPaste(markup.trimEnd());
        }
    }

    function onTextAreaFocus() {
        AppStateChange.obtainKeyboard();
        onFocus && onFocus();
    }

    function onTextAreaBlur() {
        AppStateChange.relinquishKeyboard();
        onBlur && onBlur();
    }

    function onInput(event: Event) {
        if (event.target instanceof HTMLTextAreaElement) {
            const target = event.target;
            const value = target.value;

            if (onContentChange) {
                onContentChange(value);
            }
        }
    }

    let klasses = elementClass;
    if (hovering) {
        klasses += " drop-target";
    }

    return (
        <div>
            <CivRight>
                <HelpMarkupSyntax />
            </CivRight>
            <textarea
                class={klasses}
                id={id}
                type="text"
                name={id}
                value={value}
                ref={elementRef}
                onFocus={onTextAreaFocus}
                onBlur={onTextAreaBlur}
                onInput={onInput}
            />
        </div>
    );
}

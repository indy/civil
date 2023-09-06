import { useEffect } from "preact/hooks";

export default function useDragDrop(
    dragAreaRef: any,
    droppedFiles: (f: FileList) => void,
    setHovering?: (b: boolean) => void
) {
    function dragEnter(e: Event) {
        e.stopPropagation();
        e.preventDefault();
        if (setHovering) {
            setHovering(true);
        }
    }

    function dragLeave(e: Event) {
        e.stopPropagation();
        e.preventDefault();
        if (setHovering) {
            setHovering(false);
        }
    }

    function dragOver(e: Event) {
        e.stopPropagation();
        e.preventDefault();
    }

    function drop(e: DragEvent) {
        e.stopPropagation();
        e.preventDefault();

        const dt = e.dataTransfer;
        if (dt) {
            const files = dt.files;

            droppedFiles(files);
        }
        if (setHovering) {
            setHovering(false);
        }
    }

    useEffect(() => {
        if (dragAreaRef && dragAreaRef.current) {
            const dragAreaElement = dragAreaRef.current as HTMLElement;
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
        return () => {}; // to please tsc
    });
}

import { h } from "preact";
import { useState } from "preact/hooks";

export default function DeleteConfirmation({ onDelete }: { onDelete?: any }) {

    const [showToggle, setShowToggle] = useState(false);

    function buttonClicked(e: Event) {
        e.preventDefault();
        setShowToggle(true);
    }

    function noClicked(e: Event) {
        e.preventDefault();
        setShowToggle(false);
    }

    function yesClicked(e: Event) {
        e.preventDefault();
        setShowToggle(false);
        onDelete();
    }

    return (
    <span>
        {!showToggle && <button onClick={ buttonClicked }>Delete...</button>}
        { showToggle && <button onClick={ noClicked }>No, Cancel Delete</button>}
        { showToggle && <button onClick={ yesClicked }>Yes, Really Delete</button>}
    </span>);
}

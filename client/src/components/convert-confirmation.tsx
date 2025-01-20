import { useState } from "preact/hooks";

type Props = {
    onConvert: () => void;
    convertText: string;
};

export default function ConvertConfirmation({ onConvert, convertText }: Props) {
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
        onConvert();
    }

    return (
        <span class="c-convert-confirmation">
            {!showToggle && (
                <button class="c-civil-button" onClick={buttonClicked}>
                    { convertText }
                </button>
            )}
            {showToggle && (
                <button class="c-civil-button" onClick={noClicked}>
                    No, Cancel Convert
                </button>
            )}
            {showToggle && (
                <button class="c-civil-button" onClick={yesClicked}>
                    Yes, Really Convert
                </button>
            )}
        </span>
    );
}

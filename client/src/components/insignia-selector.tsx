import { h } from "preact";

import { setbit, clearbit, bitset, bitAsValue } from "shared/bitops";
import { renderInsignia } from "components/insignia-renderer";

type Props = {
    insigniaId: number;
    onChange: (id: number) => void;
    extraClasses?: string;
};

export default function InsigniaSelector({
    insigniaId,
    onChange,
    extraClasses,
}: Props) {
    function onTicked(bit: number) {
        let val = setbit(insigniaId, bit);
        onChange(val);
    }

    function onUnticked(bit: number) {
        let val = clearbit(insigniaId, bit);
        onChange(val);
    }

    let klass = "icon-horizontal-grouping ";
    if (extraClasses) {
        klass += extraClasses;
    }

    return (
        <div class={klass}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <SingleInsignia
                    value={insigniaId}
                    bit={i}
                    onTicked={onTicked}
                    onUnticked={onUnticked}
                />
            ))}
        </div>
    );
}

type SingleInsigniaProps = {
    value: number;
    bit: number;
    onTicked: (bit: number) => void;
    onUnticked: (bit: number) => void;
};

function SingleInsignia({
    value,
    bit,
    onTicked,
    onUnticked,
}: SingleInsigniaProps) {
    let cl = "icon-button ";
    cl += bitset(value, bit) ? "icon-selected" : "icon-unselected";

    function onClickHandler() {
        if (bitset(value, bit)) {
            onUnticked(bit);
        } else {
            onTicked(bit);
        }
    }

    return (
        <div class={cl} onClick={onClickHandler}>
            {renderInsignia(bitAsValue(bit))}
        </div>
    );
}

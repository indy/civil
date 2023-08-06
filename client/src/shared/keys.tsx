// map key code for an alphanumeric character to an index value
//
//  digit: 1 -> 0, 2 ->  1, ... 9 ->  8
// letter: a -> 9, b -> 10, ... z -> 34
//
export function indexFromCode(code: string): number {
    // this was the simple code that now has to be replaced
    // because the retards who define web standards have
    // deprecated keyCode .
    //
    // const index =
    //     e.keyCode >= 49 && e.keyCode <= 57
    //         ? e.keyCode - 49
    //         : e.keyCode - 65 + 9;

    switch (code) {
        case "Digit1":
            return 0;
        case "Digit2":
            return 1;
        case "Digit3":
            return 2;
        case "Digit4":
            return 3;
        case "Digit5":
            return 4;
        case "Digit6":
            return 5;
        case "Digit7":
            return 6;
        case "Digit8":
            return 7;
        case "Digit9":
            return 8;
        case "KeyA":
            return 9;
        case "KeyB":
            return 10;
        case "KeyC":
            return 11;
        case "KeyD":
            return 12;
        case "KeyE":
            return 13;
        case "KeyF":
            return 14;
        case "KeyG":
            return 15;
        case "KeyH":
            return 16;
        case "KeyI":
            return 17;
        case "KeyJ":
            return 18;
        case "KeyK":
            return 19;
        case "KeyL":
            return 20;
        case "KeyM":
            return 21;
        case "KeyN":
            return 22;
        case "KeyO":
            return 23;
        case "KeyP":
            return 24;
        case "KeyQ":
            return 25;
        case "KeyR":
            return 26;
        case "KeyS":
            return 27;
        case "KeyT":
            return 28;
        case "KeyU":
            return 29;
        case "KeyV":
            return 30;
        case "KeyW":
            return 31;
        case "KeyX":
            return 32;
        case "KeyY":
            return 33;
        case "KeyZ":
            return 34;
        default: {
            // console.error(`invalid code value: '${code}'`);
            return -1;
        }
    }
}

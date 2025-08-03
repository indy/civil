import { Role, Font, RenderingDeckPart } from "../enums";

export function fontClass(font: Font, rdp: RenderingDeckPart): string {
    function rdpClassName(rdp: RenderingDeckPart): string {
        switch (rdp) {
            case RenderingDeckPart.Body:
                return "-body";
            case RenderingDeckPart.Heading:
                return "-heading";
            case RenderingDeckPart.UiInterleaved:
                return "-ui-interleaved";
        }
    }

    function fontToString(f: Font): string {
        switch (f) {
            case Font.Serif:
                return "serif";
            case Font.Sans:
                return "sans";
            case Font.Cursive:
                return "cursive";
            case Font.AI:
                return "ai";
            case Font.DeWalpergens:
                return "de-walpergens";
            case Font.Essays1743:
                return "essays-1743";
            case Font.Hyperlegible:
                return "hyperlegible";
            default:
                throw new Error(`Unhandled Font enum value: ${f}`);
        }
    }

    switch (font) {
        case Font.DeWalpergens:
            return "typeface-" + fontToString(font) + rdpClassName(rdp);
        default:
            return "typeface-" + fontToString(font);
    }
}

export function fontForRole(role: Role): Font {
    switch (role) {
        case Role.System:
            return Font.Serif;
        case Role.Assistant:
            return Font.AI;
        case Role.User:
            return Font.Cursive;
    }
}

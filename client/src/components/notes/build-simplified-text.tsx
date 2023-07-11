import { WasmInterface } from "types";

type Element = {
    name: string;
    key?: number;
    class_name?: string;

    html_for?: string;
    href?: string;
    src?: string;
    html_type?: string;
    id?: string;
    start?: string;

    children: Array<Element>;
    text?: string;
};

// build simplified text representation of the content for input into AI systems
//
export default function buildSimplifiedText(content: string, wasmInterface: WasmInterface) {
    // an accurate note id isn't required for buildSimplifiedText since we won't
    // output any margin content. we only care about the body text
    //
    const astArray = wasmInterface.markupAsStruct(content, 0);
    if (!astArray) {
        console.error(`unable to correctly parse: '${content}'`);
        return false;
    }

    function isOnRightMargin(n: Element): boolean {
        if (!n.class_name) {
            return false;
        }

        let onRight =
            n.class_name.search("right-margin") >= 0 ||
            n.class_name.search("right-margin-numbered") >= 0 ||
            n.class_name.search("right-margin-scribble") >= 0;

        return onRight;
    }

    function compile(n: Element, onRight: boolean) {
        let isOnRight = onRight || isOnRightMargin(n);
        if (isOnRight) {
            return "";
        }

        let children = n.children
            .filter((child) => !isOnRightMargin(child))
            .map((child) => compile(child, isOnRight));

        // console.log(n.name);

        if (n.name === "text") {
            return n.text;
        } else if (n.name === "li") {
            return ["\n", ...children];
        } else {
            return children;
        }
    }

    function isEmpty(ns: string | Array<string>): boolean {
        return Array.isArray(ns) && ns.length === 0;
    }

    function removeEmpty(ns: string | Array<string>) {
        if (Array.isArray(ns)) {
            return ns
                .filter((child) => !isEmpty(child))
                .map((child) => removeEmpty(child));
        } else {
            return ns;
        }
    }

    let textTree = astArray.map((node: Element) => {
        return compile(node, false);
    });

    //    console.log(textTree);

    return removeEmpty(textTree).flat().join(" ");
}

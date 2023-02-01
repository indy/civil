import { h } from "preact";
import { Link } from "preact-router";

import { renderInsignia } from './Insignias';

export default function DeckLink({ extraClasses, onClick, resource, href, insignia, name, children}: { extraClasses?: string, onClick?: any, resource: string, href: string, insignia: number, name: string, children?: any}) {
    function clicked(e: Event) {
        if (onClick) {
            onClick(e)
        }
    }

    const klass = `${ extraClasses } pigment-fg-${resource}`
    return (
     <Link class={ klass }
             href={ href }
             onClick={clicked}>
        { children }
        { renderInsignia(insignia) }
        { name }
    </Link>);
}

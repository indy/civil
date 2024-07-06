import { useState } from "preact/hooks";

export default function HelpMarkupSyntax({}) {
    const [expanded, setExpanded] = useState(false);

    function clickedToggle() {
        setExpanded(!expanded);
    }

    if (!expanded) {
        return <div onClick={clickedToggle}>show help</div>
    } else {
        return (
            <div class="help-markup-syntax">
                <div onClick={clickedToggle}>hide help</div>
                <div class="help-markup-syntax-content">
                <table>
                <tr>
                <th class="xxxhelp-overlay-key">Syntax</th>
                <th class="xxxhelp-overlay-desc">Description</th>
                </tr>
                <tr>
                <td class="xxxhelp-overlay-key">b</td>
                <td class="xxxhelp-overlay-desc">bold</td>
                </tr>
                <tr>
                <td class="xxxhelp-overlay-key">i</td>
                <td class="xxxhelp-overlay-desc">italic</td>
                </tr>
                <tr>
                <td class="xxxhelp-overlay-key">u</td>
                <td class="xxxhelp-overlay-desc">underline</td>
                </tr>
                <tr>
                <td class="xxxhelp-overlay-key">h1</td>
                <td class="xxxhelp-overlay-desc">heading level 1, other heading levels: 2..9</td>
            </tr>
                <tr>
                <td class="xxxhelp-overlay-key">blockquote</td>
                <td class="xxxhelp-overlay-desc"></td>
                </tr>
                <tr>
                <td class="xxxhelp-overlay-key">img</td>
                <td class="xxxhelp-overlay-desc"></td>
                </tr>
                <tr>
                <td class="xxxhelp-overlay-key">url</td>
                <td class="xxxhelp-overlay-desc"></td>
                </tr>
                <tr>
                <td class="xxxhelp-overlay-key">youtube</td>
                <td class="xxxhelp-overlay-desc"></td>
                </tr>
                <tr>
                <td class="xxxhelp-overlay-key">comment</td>
                <td class="xxxhelp-overlay-desc"></td>
                </tr>
                <tr>
                <td class="xxxhelp-overlay-key">disagree</td>
                <td class="xxxhelp-overlay-desc"></td>
                </tr>
                <tr>
                <td class="xxxhelp-overlay-key">nside</td>
                <td class="xxxhelp-overlay-desc"></td>
                </tr>
                <tr>
                <td class="xxxhelp-overlay-key">side</td>
                <td class="xxxhelp-overlay-desc"></td>
                </tr>
                <tr>
                <td class="xxxhelp-overlay-key">code</td>
                <td class="xxxhelp-overlay-desc"></td>
                </tr>
                <tr>
                <td class="xxxhelp-overlay-key">verbatim</td>
                <td class="xxxhelp-overlay-desc"></td>
                </tr>
                <tr>
                <td class="xxxhelp-overlay-key">deleted</td>
                <td class="xxxhelp-overlay-desc"></td>
                </tr>
                <tr>
                <td class="xxxhelp-overlay-key">subscript</td>
                <td class="xxxhelp-overlay-desc"></td>
                </tr>
                <tr>
                <td class="xxxhelp-overlay-key">superscript</td>
                <td class="xxxhelp-overlay-desc"></td>
                </tr>
                <tr>
                <td class="xxxhelp-overlay-key">hi</td>
                <td class="xxxhelp-overlay-desc">highlight</td>
                </tr>
                <tr>
                <td class="xxxhelp-overlay-key">hi-red</td>
                <td class="xxxhelp-overlay-desc">red highlight, other colours: green, blue, yellow, orange, pink, purple</td>
            </tr>
                <tr>
                <td class="xxxhelp-overlay-key">red</td>
                <td class="xxxhelp-overlay-desc">red text, other colours: green, blue, yellow, orange, pink, purple</td>
            </tr>
            </table>
            </div>
            </div>
        );
    }
}

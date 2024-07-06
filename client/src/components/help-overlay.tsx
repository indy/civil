import { getAppState } from "../app-state";

export default function HelpOverlay({}) {
    const appState = getAppState();

    if (appState.showingHelpOverlay.value) {
        return (
            <div class="help-overlay">
                <div class="help-overlay-content">
                    <table>
                        <tr>
                            <th>Section</th>
                            <th class="help-overlay-key">Key</th>
                            <th class="help-overlay-desc">Description</th>
                        </tr>
                        <tr>
                            <td>Toolbar</td>
                            <td class="help-overlay-key">Escape</td>
                            <td class="help-overlay-desc">View mode</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td class="help-overlay-key">/</td>
                            <td class="help-overlay-desc">Search</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td class="help-overlay-key">r</td>
                            <td class="help-overlay-desc">Refs mode</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td class="help-overlay-key">n</td>
                            <td class="help-overlay-desc">Edit mode</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td class="help-overlay-key">u</td>
                            <td class="help-overlay-desc">Upper insert mode</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td class="help-overlay-key">c</td>
                            <td class="help-overlay-desc">
                                Memorise card mode
                            </td>
                        </tr>
                        <tr>
                            <td></td>
                            <td class="help-overlay-key">b</td>
                            <td class="help-overlay-desc">Bookmarks mode</td>
                        </tr>
                        <tr>
                            <td>Navigation</td>
                            <td class="help-overlay-key">h</td>
                            <td class="help-overlay-desc">Home</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td class="help-overlay-key">a</td>
                            <td class="help-overlay-desc">Articles</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td class="help-overlay-key">d</td>
                            <td class="help-overlay-desc">Dialogues</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td class="help-overlay-key">e</td>
                            <td class="help-overlay-desc">Events</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td class="help-overlay-key">i</td>
                            <td class="help-overlay-desc">Ideas</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td class="help-overlay-key">p</td>
                            <td class="help-overlay-desc">People</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td class="help-overlay-key">q</td>
                            <td class="help-overlay-desc">Quotes</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td class="help-overlay-key">t</td>
                            <td class="help-overlay-desc">Timelines</td>
                        </tr>
                        <tr>
                            <td>General</td>
                            <td class="help-overlay-key">?</td>
                            <td class="help-overlay-desc">Show help overlay</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td class="help-overlay-key">s</td>
                            <td class="help-overlay-desc">
                                Search selected text
                            </td>
                        </tr>
                        <tr>
                            <td></td>
                            <td class="help-overlay-key">w</td>
                            <td class="help-overlay-desc">
                                Toggle narrow reading mode
                            </td>
                        </tr>
                        <tr>
                            <td></td>
                            <td class="help-overlay-key">m</td>
                            <td class="help-overlay-desc">
                                Toggle showing deck metadata form
                            </td>
                        </tr>
                        <tr>
                            <td>Quotes</td>
                            <td class="help-overlay-key">,</td>
                            <td class="help-overlay-desc">Prev quote</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td class="help-overlay-key">.</td>
                            <td class="help-overlay-desc">Next quote</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td class="help-overlay-key">j</td>
                            <td class="help-overlay-desc">
                                Jump to random quote
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
        );
    } else {
        return <div></div>;
    }
}

import { h } from "preact";

import { nonEmptyArray, plural } from '../JsUtils';

import RollableSection from './RollableSection';
import { ListingLink } from './ListingLink';

export default function SectionSearchResultsBackref({ backrefs }: { backrefs?: any }) {
    function buildBackref(lb) {
        return (
            <ListingLink id={ lb.id }
                                 insignia={ lb.insignia }
                                 name={ lb.name }
                                 resource={ lb.resource }/>
        );
    }

    if(nonEmptyArray(backrefs)) {
        const heading = plural(backrefs.length, 'Additional Search Result', 's');
        return (
        <RollableSection heading={ heading } initiallyRolledUp>
            <ul>
                { backrefs.map(buildBackref) }
            </ul>
        </RollableSection>);
    } else {
        return <div></div>;
    }
}

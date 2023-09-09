import { GeoResult } from "../types";

import Net from "../shared/net";

export async function geoGet(location: string) {
    // have to use getCORS because we're not allowed to set 'content-type'
    let geoResult = await Net.getCORS(`https://geocode.xyz/${location}?json=1`);
    return geoResult;
}

export function getLatitudeLongitude(
    geoResult: GeoResult
): [boolean, number, number] {
    if (geoResult.error) {
        return [false, 0.0, 0.0];
    }

    let latt = parseFloat(geoResult.latt);
    let longt = parseFloat(geoResult.longt);

    if (isNaN(latt) || isNaN(longt)) {
        return [false, 0.0, 0.0];
    }

    if (latt === 0.0 && longt === 0.0) {
        return [false, 0.0, 0.0];
    }

    return [true, latt, longt];
}

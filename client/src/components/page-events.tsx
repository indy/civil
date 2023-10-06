import { useEffect, useState } from "preact/hooks";

import {
    DeckEvent,
    DeckKind,
    DeckManagerFlags,
    DM,
    Font,
    GeoResult,
    SlimDeck,
    ProtoEvent,
} from "../types";

import { geoGet, getLatitudeLongitude } from "../shared/geo";
import Net from "../shared/net";

import {
    asHumanReadableDate,
    asHumanReadableDateRange,
    parseDateStringAsTriple,
    parseDateStringAsYearOnly,
    normaliseDateString,
} from "../shared/time";

import CivilButton from "./civil-button";
import CivilButtonCreateDeck from "./civil-button-create-deck";
import CivilInput from "./civil-input";
import CivilTabButton from "./civil-tab-button";
import DeleteDeckConfirmation from "./delete-deck-confirmation";
import FontSelector from "./font-selector";
import InsigniaSelector from "./insignia-selector";
import { HeadedSegment } from "./headed-segment";
import { listItemSlimDeck } from "./list-items";
import Pagination from "./pagination";
import SegmentArrivals from "./segment-arrivals";
import SegmentDeckRefs from "./segment-deck-refs";
import SegmentGraph from "./segment-graph";
import SegmentHits from "./segment-hits";
import SegmentNotes from "./segment-notes";
import SegmentSearchResults from "./segment-search-results";
import TopBarMenu from "./top-bar-menu";
import TopMatter from "./top-matter";
import useDeckManager from "./use-deck-manager";

import {
    CivContainer,
    CivForm,
    CivLeftLabel,
    CivMain,
    CivRight,
} from "./civil-layout";

function Events({ path }: { path?: string }) {
    return (
        <div>
            <TopBarMenu />
            <EventsModule />
        </div>
    );
}

function EventsModule() {
    const url = `/api/events/pagination`;

    const lowerContent = (
        <CivilButtonCreateDeck
            deckKind={DeckKind.Event}
        ></CivilButtonCreateDeck>
    );

    function FakeTopSelector() {
        return (
            <div class="c-paginator-top-selector pagination-top-selector">
                <CivilTabButton extraClasses="pigment-events selected">
                    All
                </CivilTabButton>
            </div>
        );
    }

    return (
        <HeadedSegment
            extraClasses="c-events-module"
            heading="Events"
            extraHeadingClasses="margin-top-0"
        >
            <FakeTopSelector />
            <Pagination
                url={url}
                renderItem={listItemSlimDeck}
                itemsPerPage={10}
                lowerContent={lowerContent}
            />
        </HeadedSegment>
    );
}

function CivEvent({ path, id }: { path?: string; id?: string }) {
    let flags = DeckManagerFlags.Summary;
    const deckManager: DM<DeckEvent> = useDeckManager(
        id,
        DeckKind.Event,
        flags
    );

    const deck: DeckEvent | undefined = deckManager.getDeck();
    if (deck) {
        deckManager.complyWithAppStateRequestToShowUpdateForm();
        return (
            <article>
                <TopMatter
                    title={deck.title}
                    deck={deck}
                    displayHits={deckManager.displayHits()}
                    setDisplayHits={deckManager.setDisplayHits}
                    isShowingUpdateForm={deckManager.isShowingUpdateForm()}
                    setShowingUpdateForm={deckManager.setShowingUpdateForm}
                    isEditingDeckRefs={deckManager.isEditingDeckRefs()}
                    setEditingDeckRefs={deckManager.setEditingDeckRefs}
                >
                    {deck.dateTextual}
                </TopMatter>

                {deckManager.isShowingUpdateForm() && (
                    <section>
                        <CivContainer>
                            <CivMain>
                                <DeleteDeckConfirmation
                                    deckKind={deckManager.getDeckKind()}
                                    id={deck.id}
                                />
                                <CivilButton
                                    onClick={deckManager.onShowSummaryClicked}
                                >
                                    Show Summary Passage
                                </CivilButton>
                            </CivMain>
                        </CivContainer>
                        <div class="vertical-spacer"></div>
                        <CivContainer>
                            <EventUpdater
                                event={deck}
                                onUpdate={deckManager.updateAndReset}
                                onCancel={() =>
                                    deckManager.setShowingUpdateForm(false)
                                }
                            />
                        </CivContainer>
                    </section>
                )}

                <SegmentDeckRefs
                    deck={deck}
                    isEditingDeckRefs={deckManager.isEditingDeckRefs()}
                    setEditingDeckRefs={deckManager.setEditingDeckRefs}
                    onRefsChanged={deckManager.onRefsChanged}
                />

                <SegmentHits
                    displayHits={deckManager.displayHits()}
                    deck={deck}
                />

                <SegmentNotes
                    deck={deck}
                    title={deck.title}
                    onRefsChanged={deckManager.onRefsChanged}
                    deckKind={deckManager.getDeckKind()}
                    howToShowPassage={deckManager.howToShowPassage}
                    canShowPassage={deckManager.canShowPassage}
                    onUpdateDeck={deckManager.update}
                />
                <SegmentArrivals deck={deck} />
                <SegmentSearchResults slimdeck={deck as SlimDeck} />
                <SegmentGraph deck={deck} />
            </article>
        );
    } else {
        return <article></article>;
    }
}

type EventUpdaterProps = {
    event: DeckEvent;
    onUpdate: (d: DeckEvent) => void;
    onCancel: () => void;
};

type LocalState = {
    title: string;

    insigniaId: number;
    font: Font;

    impact: number;

    locationTextual?: string;
    latitude?: number;
    longitude?: number;
    locationFuzz: number;

    dateTextual?: string;
    exactDate?: string;
    lowerDate?: string;
    upperDate?: string;
    dateFuzz: number;

    isDateApprox: boolean;
    roundToYear: boolean;
};

function EventUpdater({ event, onUpdate, onCancel }: EventUpdaterProps) {
    const initialState: LocalState = {
        title: event.title || "",
        insigniaId: event.insignia || 0,
        font: event.font || Font.DeWalpergens,

        impact: event.impact,

        locationTextual: event.locationTextual,
        longitude: event.longitude,
        latitude: event.latitude,
        locationFuzz: event.locationFuzz,

        dateTextual: event.dateTextual,
        exactDate: event.exactDate,
        lowerDate: event.lowerDate,
        upperDate: event.upperDate,
        dateFuzz: event.dateFuzz,

        isDateApprox: false,
        roundToYear: false,
    };
    const [localState, setLocalState] = useState(initialState);

    function setLocalStateDateChange(s: LocalState) {
        const parsedLowerDate = parseDateStringAsTriple(s.lowerDate);
        const parsedUpperDate = parseDateStringAsTriple(s.upperDate);
        const parsedExactDate = parseDateStringAsTriple(s.exactDate);

        if (parsedLowerDate && parsedUpperDate) {
            s.dateTextual = asHumanReadableDateRange(
                parsedLowerDate,
                parsedUpperDate,
                s.isDateApprox,
                s.roundToYear,
                false
            );
            s.dateFuzz = 0.0;
        } else if (parsedExactDate) {
            s.dateTextual = asHumanReadableDate(
                parsedExactDate,
                s.isDateApprox,
                s.roundToYear
            );
            s.dateFuzz = 0.5;
        } else {
            let year = parseDateStringAsYearOnly(s.exactDate!);
            if (year) {
                s.dateTextual = `${year}`;
                s.roundToYear = true;
            } else {
                s.dateTextual = "";
                s.roundToYear = false;
            }
        }
        setLocalState(s);
    }

    useEffect(() => {
        if (event.title && event.title !== "" && localState.title === "") {
            setLocalState({
                ...localState,
                title: event.title,
            });
        }
        if (event.insignia) {
            setLocalState({
                ...localState,
                insigniaId: event.insignia,
            });
        }
        if (event.font) {
            setLocalState({
                ...localState,
                font: event.font,
            });
        }
    }, [event]);

    function handleChangeEvent(event: Event) {
        if (event.target instanceof HTMLInputElement) {
            const target = event.target;
            const name = target.name;
            const value =
                target.type === "checkbox" ? target.checked : target.value;
            const svalue: string = value as string;

            let newState = { ...localState };

            if (name === "latitude") {
                newState.latitude = parseFloat(svalue);
            } else if (name === "longitude") {
                newState.longitude = parseFloat(svalue);
            } else if (name === "isDateApprox") {
                let bvalue: boolean = value as boolean;
                newState.isDateApprox = bvalue;
                // newState = buildReadableDateFromLast(newState);
            } else if (name === "roundToYear") {
                let bvalue: boolean = value as boolean;
                newState.roundToYear = bvalue;
                // newState = buildReadableDateFromLast(newState);
            } else {
                console.error(
                    "handleChangeEvent: unknown target name: " + name
                );
            }

            setLocalStateDateChange(newState);
        }
    }

    const handleSubmit = (e: Event) => {
        const data: ProtoEvent = {
            title: localState.title.trim(),
            deckKind: DeckKind.Event,
            insignia: localState.insigniaId,
            font: localState.font,
            graphTerminator: false,
            impact: localState.impact,

            locationTextual: localState.locationTextual,
            longitude: localState.longitude,
            latitude: localState.latitude,
            locationFuzz: localState.locationFuzz,

            dateTextual: localState.dateTextual,
            exactDate: normaliseDateString(localState.exactDate),
            lowerDate: normaliseDateString(localState.lowerDate),
            upperDate: normaliseDateString(localState.upperDate),
            dateFuzz: localState.dateFuzz,
        };

        // edit an existing event
        Net.put<ProtoEvent, DeckEvent>(`/api/events/${event.id}`, data).then(
            (newDeck) => {
                onUpdate(newDeck);
            }
        );

        e.preventDefault();
    };

    function setInsigniaId(id: number) {
        setLocalState({
            ...localState,
            insigniaId: id,
        });
    }

    function setFont(font: Font) {
        setLocalState({
            ...localState,
            font,
        });
    }

    async function onFindLocationClicked(event: Event) {
        event.preventDefault();

        let geoResult: GeoResult | unknown = await geoGet(
            localState.locationTextual!
        );

        if (geoResult) {
            let [isOk, latitudeNew, longitudeNew] = getLatitudeLongitude(
                geoResult as GeoResult
            );

            if (isOk) {
                let newState = {
                    ...localState,
                    latitude: latitudeNew.toFixed(2) as unknown as number,
                    longitude: longitudeNew.toFixed(2) as unknown as number,
                };
                // props.onPointChange(props.id, newState);
                setLocalState(newState);
            } else {
                console.log(
                    `geoResult failed for ${localState.locationTextual}`
                );
                console.log(geoResult);
            }
        }
    }

    function impactAsText(impact: number): string {
        switch (impact) {
            case 0:
                return "Unimportant";
            case 1:
                return "Noteworthy";
            case 2:
                return "Important";
            case 3:
                return "World Changing";
            case 4:
                return "Humanity Changing";
            default:
                return "unknown impact value!!!!";
        }
    }

    function onImpactChange(event: Event) {
        if (event.target instanceof HTMLInputElement) {
            setLocalState({
                ...localState,
                impact: event.target.valueAsNumber,
            });
        }
    }

    return (
        <CivForm onSubmit={handleSubmit}>
            <CivLeftLabel forId="title">Title</CivLeftLabel>

            <CivMain>
                <CivilInput
                    id="title"
                    value={localState.title}
                    onContentChange={(title) =>
                        setLocalState({ ...localState, title })
                    }
                />
            </CivMain>

            <CivLeftLabel extraClasses="icon-left-label">
                Insignias
            </CivLeftLabel>
            <CivMain>
                <InsigniaSelector
                    insigniaId={localState.insigniaId}
                    onChange={setInsigniaId}
                />
            </CivMain>

            <CivLeftLabel>Font</CivLeftLabel>
            <CivMain>
                <FontSelector font={localState.font} onChangedFont={setFont} />
            </CivMain>

            <div class="vertical-spacer"></div>

            <CivLeftLabel>Impact</CivLeftLabel>
            <CivMain>
                <input
                    type="range"
                    min="0"
                    max="4"
                    value={localState.impact}
                    class="slider"
                    id="impactSlider"
                    onInput={onImpactChange}
                />
                <CivRight>{impactAsText(localState.impact)}</CivRight>
            </CivMain>

            <div class="vertical-spacer"></div>

            <CivLeftLabel forId="exactDate">Exact Date</CivLeftLabel>
            <CivMain>
                <CivilInput
                    id="exactDate"
                    value={localState.exactDate}
                    onContentChange={(exactDate) =>
                        setLocalStateDateChange({ ...localState, exactDate })
                    }
                />
                <CivRight>
                    <span>Format: YYYY-MM-DD</span>
                </CivRight>
            </CivMain>

            <CivLeftLabel forId="lowerDate">Lower Date</CivLeftLabel>
            <CivMain>
                <CivilInput
                    id="lowerDate"
                    value={localState.lowerDate}
                    onContentChange={(lowerDate) =>
                        setLocalStateDateChange({ ...localState, lowerDate })
                    }
                />
            </CivMain>
            <CivLeftLabel forId="upperDate">Upper Date</CivLeftLabel>
            <CivMain>
                <CivilInput
                    id="upperDate"
                    value={localState.upperDate}
                    onContentChange={(upperDate) =>
                        setLocalStateDateChange({ ...localState, upperDate })
                    }
                />
            </CivMain>

            <CivMain>
                <div class="pointform-block pointform-space-top">
                    <input
                        id="round-to-year"
                        class="pointform-checkbox"
                        type="checkbox"
                        name="roundToYear"
                        checked={localState.roundToYear}
                        onInput={handleChangeEvent}
                    />
                    <label for="round-to-year">Round to Year</label>
                </div>
                <div class="pointform-block">
                    <input
                        id="is-approx"
                        class="pointform-checkbox"
                        type="checkbox"
                        name="isDateApprox"
                        checked={localState.isDateApprox}
                        onInput={handleChangeEvent}
                    />
                    <label for="is-approx">Is Approx</label>
                </div>
            </CivMain>

            <CivLeftLabel forId="dateTextual">Displayed Date</CivLeftLabel>
            <CivMain>
                <CivilInput
                    id="dateTextual"
                    value={localState.dateTextual}
                    readOnly={true}
                />
            </CivMain>

            <div class="vertical-spacer"></div>

            <CivLeftLabel forId="locationTextual">Location</CivLeftLabel>
            <CivMain>
                <CivilInput
                    id="locationTextual"
                    value={localState.locationTextual}
                    onContentChange={(locationTextual) =>
                        setLocalState({ ...localState, locationTextual })
                    }
                />
            </CivMain>

            <CivMain>
                <button
                    onClick={(event) => {
                        onFindLocationClicked(event);
                    }}
                >
                    Find location
                </button>
            </CivMain>

            <CivLeftLabel forId="latitude">Latitude</CivLeftLabel>
            <CivMain>
                <input
                    id="latitude"
                    type="number"
                    name="latitude"
                    step="any"
                    value={localState.latitude}
                    onInput={handleChangeEvent}
                />
            </CivMain>

            <CivLeftLabel forId="longitude">Longitude</CivLeftLabel>
            <CivMain>
                <input
                    id="longitude"
                    type="number"
                    name="longitude"
                    step="any"
                    value={localState.longitude}
                    onInput={handleChangeEvent}
                />
            </CivMain>

            <CivMain>
                <CivilButton extraClasses="dialog-cancel" onClick={onCancel}>
                    Cancel
                </CivilButton>
                <input
                    class="c-civil-button"
                    type="submit"
                    value="Update Event"
                />
            </CivMain>
        </CivForm>
    );
}

export { CivEvent, Events, EventsModule };

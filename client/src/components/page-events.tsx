import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

import {
    DeckEvent,
    DeckKind,
    DeckManagerFlags,
    DeckUpdate,
    DM,
    EventExtras,
    Font,
    GeoResult,
} from "types";

import { geoGet, getLatitudeLongitude } from "shared/geo";
import Net from "shared/net";

import {
    asHumanReadableDate,
    asHumanReadableDateRange,
    parseDateStringAsTriple,
    parseDateStringAsYearOnly,
} from "shared/time";

import CivilButton from "components/civil-button";
import CivilButtonCreateDeck from "components/civil-button-create-deck";
import CivilInput from "components/civil-input";
import CivilTabButton from "components/civil-tab-button";
import DeleteDeckConfirmation from "components/delete-deck-confirmation";
import FontSelector from "components/font-selector";
import InsigniaSelector from "components/insignia-selector";
import { Module } from "components/module";
import { renderPaginatedSlimDeck } from "components/paginated-render-items";
import Pagination from "components/pagination";
import SegmentBackDecks from "components/segment-back-decks";
import SegmentDeckRefs from "components/segment-deck-refs";
import SegmentGraph from "components/segment-graph";
import SegmentNotes from "components/segment-notes";
import SegmentSearchResults from "components/segment-search-results";
import TopBarMenu from "components/top-bar-menu";
import TopMatter from "components/top-matter";
import useDeckManager from "components/use-deck-manager";

import {
    CivContainer,
    CivForm,
    CivLeftLabel,
    CivMain,
    CivRight,
} from "components/civil-layout";

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
        <Module
            extraClasses="c-events-module"
            heading="Events"
            extraHeadingClasses="margin-top-0"
        >
            <FakeTopSelector />
            <Pagination
                url={url}
                renderItem={renderPaginatedSlimDeck}
                itemsPerPage={10}
                lowerContent={lowerContent}
            />
        </Module>
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
                <SegmentNotes
                    deck={deck}
                    title={deck.title}
                    onRefsChanged={deckManager.onRefsChanged}
                    deckKind={deckManager.getDeckKind()}
                    howToShowPassage={deckManager.howToShowPassage}
                    canShowPassage={deckManager.canShowPassage}
                    onUpdateDeck={deckManager.update}
                />
                <SegmentBackDecks deck={deck} />
                <SegmentSearchResults id={id} font={deck.font} />
                <SegmentGraph depth={2} deck={deck} />
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

    importance: number;

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

        importance: event.importance,

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
        const parsedLowerDate = parseDateStringAsTriple(s.lowerDate!);
        const parsedUpperDate = parseDateStringAsTriple(s.upperDate!);
        const parsedExactDate = parseDateStringAsTriple(s.exactDate!);

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
        type DeckEventUpdate = DeckUpdate & EventExtras;

        const data: DeckEventUpdate = {
            title: localState.title.trim(),
            insignia: localState.insigniaId,
            font: localState.font,
            graphTerminator: false,

            locationTextual: localState.locationTextual,
            longitude: localState.longitude,
            latitude: localState.latitude,
            locationFuzz: localState.locationFuzz,

            dateTextual: localState.dateTextual,
            exactDate: localState.exactDate,
            lowerDate: localState.lowerDate,
            upperDate: localState.upperDate,
            dateFuzz: localState.dateFuzz,

            importance: localState.importance,
        };

        // edit an existing event
        Net.put<DeckEventUpdate, DeckEvent>(
            `/api/events/${event.id}`,
            data
        ).then((newDeck) => {
            onUpdate(newDeck);
        });

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

    function importanceAsText(importance: number): string {
        switch (importance) {
            case 0:
                return "Normal";
            case 1:
                return "Important";
            case 2:
                return "World Changing";
            case 3:
                return "Humanity Changing";
            default:
                return "unknown importance value!!!!";
        }
    }

    function onImportanceChange(event: Event) {
        if (event.target instanceof HTMLInputElement) {
            setLocalState({
                ...localState,
                importance: event.target.valueAsNumber,
            });
        }
    }

    return (
        <CivForm onSubmit={handleSubmit}>
            <CivLeftLabel forId="title">Title</CivLeftLabel>

            <CivMain>
                <LocalInput
                    property="title"
                    localState={localState}
                    setLocalState={setLocalState}
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

            <CivLeftLabel>Importance</CivLeftLabel>
            <CivMain>
                <input
                    type="range"
                    min="0"
                    max="3"
                    value={localState.importance}
                    class="slider"
                    id="importanceSlider"
                    onInput={onImportanceChange}
                />
                <CivRight>{importanceAsText(localState.importance)}</CivRight>
            </CivMain>

            <div class="vertical-spacer"></div>

            <CivLeftLabel forId="exactDate">Exact Date</CivLeftLabel>
            <CivMain>
                <LocalInput
                    property="exactDate"
                    localState={localState}
                    setLocalState={setLocalStateDateChange}
                />
                <CivRight>
                    <span>Format: YYYY-MM-DD</span>
                </CivRight>
            </CivMain>

            <CivLeftLabel forId="lowerDate">Lower Date</CivLeftLabel>
            <CivMain>
                <LocalInput
                    property="lowerDate"
                    localState={localState}
                    setLocalState={setLocalStateDateChange}
                />
            </CivMain>
            <CivLeftLabel forId="upperDate">Upper Date</CivLeftLabel>
            <CivMain>
                <LocalInput
                    property="upperDate"
                    localState={localState}
                    setLocalState={setLocalStateDateChange}
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
                <LocalInput
                    property="locationTexual"
                    localState={localState}
                    setLocalState={setLocalState}
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

function LocalInput({ property, localState, setLocalState }) {
    function onChange(content: string) {
        let newState = { ...localState };
        newState[property] = content;
        setLocalState(newState);
    }

    return (
        <CivilInput
            id={property}
            value={localState[property]}
            onContentChange={onChange}
        />
    );
}

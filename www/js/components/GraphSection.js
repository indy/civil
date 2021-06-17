import { useState, useEffect, html } from '/lib/preact/mod.js';
import Graph2 from '/js/components/Graph2.js';
import { useStateValue } from '/js/StateProvider.js';
import RollableSection from '/js/components/RollableSection.js';




export default function GraphSection({ heading, okToShowGraph, id, depth}) {
  const [state] = useStateValue();

  const [graphState, setGraphState] = useState({});


  useEffect(() => {

    let newState = {
      n2: {},
      e2: [],
      nodes: [{
        id: id,
        is_important: true,
        expanded: true,
        resource: state.ac.decks[state.deckIndexFromId[id]].resource,
        label: state.ac.decks[state.deckIndexFromId[id]].name,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0
      }],
      edges: []};


    newState.n2[id] = {
      id: id,
      is_important: true,
      expanded: true,
      resource: state.ac.decks[state.deckIndexFromId[id]].resource,
      label: state.ac.decks[state.deckIndexFromId[id]].name,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0
    };

    sgs(newState);
  }, []);


  function sgs(gs) {

    let n3 = {};
    let e3 = [];

    // create an updated copy of all the visible nodes

    // copy over the expanded or important nodes
    for(const key in gs.n2) {
      // console.log(key);
      if (gs.n2[key].is_important || gs.n2[key].expanded) {
        n3[key] = gs.n2[key];
      }
    }

    // copy over any nodes directly connected to the expanded or important nodes
    for (const key in n3) {
      if (n3[key].expanded) {
        for (const link of state.fullGraph[key]) {
          let [child_id, kind, strength] = link; // negative strength == backlink

          if (gs.n2[child_id] && !n3[child_id]) {
            // copy over from previous state
            n3[child_id] = gs.n2[child_id];
          } else {
            // create a new node
            n3[child_id] = {
              id: child_id,
              is_important: false,
              expanded: false,
              resource: state.ac.decks[state.deckIndexFromId[child_id]].resource,
              label: state.ac.decks[state.deckIndexFromId[child_id]].name,
              x: n3[key].x,
              y: n3[key].y,
              vx: -n3[key.vx],
              vy: -n3[key.vy]
            }
          }
        }
      }
    }

    // update links
    for (const key in n3) {
      for (const link of state.fullGraph[key]) {
        let [child_id, kind, strength] = link; // negative strength == backlink
        if (n3[child_id]) {
          // only if both sides of the link are being displayed
          e3.push([key, child_id, strength, kind]);
        }
      }
    }

    // update the nodes on the graphState
    gs.n2 = n3;
    gs.e2 = e3;

    // console.log(gs);
    // console.log(n3);
    // console.log(e3);

    setGraphState(gs);

    return gs;
  }


  return html`
    <${RollableSection} heading=${ heading } initiallyRolledUp>
      ${ okToShowGraph && html`<${Graph2} id=${ id } depth=${ depth } graphState=${graphState} setGraphState=${sgs}/>`}
    </${RollableSection}>`;

  /*
    return html`
    <${RollableSection} heading=${ heading } initiallyRolledUp>
    ${ okToShowGraph && html`<${Graph} id=${ id } depth=${ depth } />`}
    </${RollableSection}>`;

  */
}

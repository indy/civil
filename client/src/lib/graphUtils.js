export function buildGraph(state, id, depth, onlyIdeas) {

  function allowIdeas(id) {
    return state.ac.decks[state.deckIndexFromId[id]].resource === "ideas";
  }
  function allowAll(id) {
    return true;
  }

  let usedSet = new Set();
  let connectionArr = buildConnectivity(state.fullGraph, id, depth, onlyIdeas ? allowIdeas : allowAll);

  let resEdges = [];
  for (let [source, target, strength] of connectionArr) {
    usedSet.add(source);
    usedSet.add(target);

    resEdges.push({source, target, strength});
  }

  let resNodes = [];
  for (let u of usedSet) {
    resNodes.push({id: u});
  }

  return {
    nodes: resNodes,
    links: resEdges
  };
}

export function buildGraphState(state, id, depth, onlyIdeas) {

  function allowIdeas(id) {
    return state.ac.decks[state.deckIndexFromId[id]].resource === "ideas";
  }
  function allowAll(id) {
    return true;
  }

  let usedSet = new Set();
  let connectionArr = buildConnectivity(state.fullGraph, id, depth, onlyIdeas ? allowIdeas : allowAll);

  let resEdges = [];
  for (let [source, target, strength] of connectionArr) {
    usedSet.add(source);
    usedSet.add(target);

    resEdges.push({source, target, strength});
  }

  let resNodes = [];
  for (let u of usedSet) {
    resNodes.push({id: u});
  }

  // id => index object
  let idToIndex = {};
  let graphState = {};
  graphState.nodes = resNodes.map((n, i) => {
    idToIndex[n.id] = i;
    return {
      id: n.id,
      label: state.ac.decks[state.deckIndexFromId[n.id]].name,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0
    }
  });

  graphState.edges = resEdges.map(n => {
    return [idToIndex[n.source], idToIndex[n.target], n.strength];
  });

  return graphState;
}

function buildConnectivity(fullGraph, deckId, depth, isNodeUsed) {
  let resultSet = new Set();
  let futureSet = new Set();    // nodes to visit
  let activeSet = new Set();    // nodes being visited in the current pass
  let visitedSet = new Set();   // nodes already processed

  if (fullGraph[deckId]) {
    // start with this 'root' node
    if (isNodeUsed(deckId)) {
      futureSet.add(deckId);
    }

    for (let i = 0; i < depth; i++) {
      // populate the active set
      activeSet.clear();
      for (let f of futureSet) {
        if (!visitedSet.has(f)) {
          // haven't processed this node so add it to activeSet
          activeSet.add(f);
        }
      }

      for (let a of activeSet) {
        let conn = fullGraph[a];
        if (conn) {
          conn.forEach(([id, strength]) => {
            if (isNodeUsed(id)) {
              // add a link between a and id
              resultSet.add([a, id, strength]);
              if (!visitedSet.has(id)) {
                futureSet.add(id);
              }
            }
          });
        }
        visitedSet.add(a);
      }
    }
  }

  // set will now contain some redundent connections
  // e.g. [123, 142, 1] as well as [142, 123, -1]
  // remove these negative strength dupes, however there may still be some
  // negative strength entries which represent incoming only connections,
  // these need to be retained (but with their from,to swapped around and
  // strength negated)
  //

  let checkSet = {};
  let res = [];
  for (let [from, to, strength] of resultSet) {
    if (strength > 0) {
      res.push([from, to, strength]);

      if (!checkSet[from]) {
        checkSet[from] = new Set();
      }
      checkSet[from].add(to);
    }
  }

  for (let [from, to, strength] of resultSet) {
    if (strength < 0) {
      if (!(checkSet[to] && checkSet[to].has(from))) {
        // an incoming connection
        res.push([to, from, -strength]);
        // no need to add [to, from] to checkSet, as there won't be another similar entry
      }
    }
  }

  return res;
}

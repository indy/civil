import NoteCompiler from './NoteCompiler';

function tokenise(content) {
  const res = NoteCompiler.tokenise(content);
  if (res.tokens === undefined) {
    console.log(`Error tokenising: "${content}"`);
    expect(false).toEqual(true);
  }

  return res.tokens;
}

function parse(tokens) {
  const res = NoteCompiler.parse(tokens);

  if (res.nodes === undefined) {
    console.log(`Error parsing: "${tokens}"`);
    expect(false).toEqual(true);
  }

  return res.nodes;
}

function expectText(node, text) {
  expect(node.type).toEqual(NoteCompiler.NodeType.TEXT);
  expect(node.value).toEqual(text);
}

function expectListItem1(node, text) {
  expect(node.type).toEqual(NoteCompiler.NodeType.LIST_ITEM);
  expect(node.children.length).toEqual(1);
  expect(node.children[0].type).toEqual(NoteCompiler.NodeType.TEXT);
  expect(node.children[0].value).toEqual(text);
}


function expectListContainer(type, node, values) {
  expect(node.type).toEqual(type);
  const children = node.children;
  expect(children.length).toEqual(values.length);
  values.forEach((e, i) => {
    expectListItem1(children[i], e);
  });
}

function expectParagraph(node, values) {
  expect(node.type).toEqual(NoteCompiler.NodeType.PARAGRAPH);
  const children = node.children;
  expect(children.length).toEqual(values.length);
  values.forEach((e, i) => {
    expectText(children[i], e);
  });
}

function expectUl(node, values) {
  expectListContainer(NoteCompiler.NodeType.UNORDERED_LIST, node, values);
}

function expectOl(node, values) {
  expectListContainer(NoteCompiler.NodeType.ORDERED_LIST, node, values);
}

it('simple strings', () => {
  let input = "shabba";

  let tokens = tokenise(input);
  expect(tokens.length).toEqual(1);

  let nodes = parse(tokens);
  expectParagraph(nodes[0], ['shabba']);

  input = "in the year 1984";

  tokens = tokenise(input);
  expect(tokens.length).toEqual(1);

  nodes = parse(tokens);
  expectParagraph(nodes[0], ['in the year 1984']);
});

it('strip trailing/leading whitespace', () => {
  let input = `



starting with newlines


`;

  let tokens = tokenise(input);
  expect(tokens.length).toEqual(3);

  let nodes = parse(tokens);
  expect(nodes.length).toEqual(1);
  expectParagraph(nodes[0], ['starting with newlines']);
});

it('strongs', () => {
  let input = 'bob said *shabba* then he fell over';

  let tokens = tokenise(input);
  expect(tokens.length).toEqual(6);

  let nodes = parse(tokens);
  expect(nodes.length).toEqual(1);
  expect(nodes[0].type).toEqual(NoteCompiler.NodeType.PARAGRAPH);

  const c = nodes[0].children;
  expect(c.length).toEqual(4);
  expect(c[0].value).toEqual('bob said ');
  expect(c[1].type).toEqual(NoteCompiler.NodeType.STRONG);
  expect(c[1].children.length).toEqual(1);
  expect(c[1].children[0].type).toEqual(NoteCompiler.NodeType.TEXT);
  expect(c[1].children[0].value).toEqual('shabba');
  expect(c[2].value).toEqual(' ');
  expect(c[3].value).toEqual('then he fell over');
});

it('highlights', () => {
  let input = 'bob said ^shabba^ then he fell over';

  let tokens = tokenise(input);
  expect(tokens.length).toEqual(6);

  let nodes = parse(tokens);
  expect(nodes.length).toEqual(1);
  expect(nodes[0].type).toEqual(NoteCompiler.NodeType.PARAGRAPH);

  const c = nodes[0].children;
  expect(c.length).toEqual(4);
  expect(c[0].value).toEqual('bob said ');
  expect(c[1].type).toEqual(NoteCompiler.NodeType.HIGHLIGHT);
  expect(c[1].children.length).toEqual(1);
  expect(c[1].children[0].type).toEqual(NoteCompiler.NodeType.TEXT);
  expect(c[1].children[0].value).toEqual('shabba');
  expect(c[2].value).toEqual(' ');
  expect(c[3].value).toEqual('then he fell over');
});

it('underlines', () => {
  let input = 'bob said _shabba_ then he fell over';

  let tokens = tokenise(input);
  expect(tokens.length).toEqual(6);

  let nodes = parse(tokens);
  expect(nodes.length).toEqual(1);
  expect(nodes[0].type).toEqual(NoteCompiler.NodeType.PARAGRAPH);

  const c = nodes[0].children;
  expect(c.length).toEqual(4);
  expect(c[0].value).toEqual('bob said ');
  expect(c[1].type).toEqual(NoteCompiler.NodeType.UNDERLINED);
  expect(c[1].children.length).toEqual(1);
  expect(c[1].children[0].type).toEqual(NoteCompiler.NodeType.TEXT);
  expect(c[1].children[0].value).toEqual('shabba');
  expect(c[2].value).toEqual(' ');
  expect(c[3].value).toEqual('then he fell over');
});

it('emphasise quotes', () => {
  let input = 'bob said "shabba" then he fell over';

  let tokens = tokenise(input);
  expect(tokens.length).toEqual(6);

  let nodes = parse(tokens);
  expect(nodes.length).toEqual(1);
  expect(nodes[0].type).toEqual(NoteCompiler.NodeType.PARAGRAPH);

  const c = nodes[0].children;
  expect(c.length).toEqual(4);
  expect(c[0].value).toEqual('bob said ');
  expect(c[1].type).toEqual(NoteCompiler.NodeType.QUOTATION);
  expect(c[1].children.length).toEqual(1);
  expect(c[1].children[0].type).toEqual(NoteCompiler.NodeType.TEXT);
  expect(c[1].children[0].value).toEqual('shabba');
  expect(c[2].value).toEqual(' ');
  expect(c[3].value).toEqual('then he fell over');
});

//  error on 'bob said | example.com ranks| cannot have space after the 1st pipe';
//  let input = 'bob said |https://example.com ^ranks^| then he fell over';

it('full stop after quotes', () => {
  let input = 'bob said "shabba ranks".';

  let tokens = tokenise(input);
  expect(tokens.length).toEqual(5);

  let nodes = parse(tokens);
  expect(nodes.length).toEqual(1);
  expect(nodes[0].type).toEqual(NoteCompiler.NodeType.PARAGRAPH);

  const c = nodes[0].children;
  expect(c.length).toEqual(3);
  expect(c[0].value).toEqual('bob said ');
  expect(c[1].type).toEqual(NoteCompiler.NodeType.QUOTATION);
  expect(c[1].children.length).toEqual(1);
  expect(c[1].children[0].type).toEqual(NoteCompiler.NodeType.TEXT);
  expect(c[1].children[0].value).toEqual('shabba ranks');
  expect(c[2].value).toEqual('.');
});

it('text and link in quotes', () => {
  let input = 'charlie said "what is [[https://google.com][a search engine]] ?".';

  let tokens = tokenise(input);
  expect(tokens.length).toEqual(15);

  let nodes = parse(tokens);
  expect(nodes.length).toEqual(1);
  expect(nodes[0].type).toEqual(NoteCompiler.NodeType.PARAGRAPH);

  const c = nodes[0].children;
  expect(c.length).toEqual(3);

  expect(c[0].type).toEqual(NoteCompiler.NodeType.TEXT);
  expect(c[0].value).toEqual('charlie said ');

  expect(c[1].type).toEqual(NoteCompiler.NodeType.QUOTATION);
  expect(c[1].children.length).toEqual(4);
  expect(c[1].children[0].type).toEqual(NoteCompiler.NodeType.TEXT);
  expect(c[1].children[0].value).toEqual('what is ');
  expect(c[1].children[1].type).toEqual(NoteCompiler.NodeType.LINK);
  expect(c[1].children[1].value).toEqual('https://google.com');
  expect(c[1].children[1].displayText).toEqual('a search engine');
  expect(c[1].children[2].type).toEqual(NoteCompiler.NodeType.TEXT);
  expect(c[1].children[2].value).toEqual(' ');
  expect(c[1].children[3].type).toEqual(NoteCompiler.NodeType.TEXT);
  expect(c[1].children[3].value).toEqual('?');

  expect(c[2].type).toEqual(NoteCompiler.NodeType.TEXT);
  expect(c[2].value).toEqual('.');
});

it('multiline', () => {
  const input = `this

is
multiline`;

  const tokens = tokenise(input);
  expect(tokens.length).toEqual(5);

  const nodes = parse(tokens);
  expect(nodes.length).toEqual(3);
  expectParagraph(nodes[0], ['this']);
  expectParagraph(nodes[1], ['is']);
  expectParagraph(nodes[2], ['multiline']);
});


it('text beginning with a number', () => {
  const input = '12 monkeys';

  const tokens = tokenise(input);
  expect(tokens.length).toEqual(3);

  const nodes = parse(tokens);

  expectParagraph(nodes[0], ['12 monkeys']);
});

it('basic li', () => {
  const input = `1. this is a list item in an ordered list
2. here's another
3. and a third`;

  const tokens = tokenise(input);
  expect(tokens.length).toEqual(14);

  const nodes = parse(tokens);

  expectOl(nodes[0], ['this is a list item in an ordered list',
                      "here's another",
                      'and a third']);
});

it('lists with greater than 10 indices', () => {

  const input = `21. twenty first item
22. twenty second item`;

  const tokens = tokenise(input);
  expect(tokens.length).toEqual(9);

  const nodes = parse(tokens);
  expect(nodes.length).toEqual(1);

  expectOl(nodes[0], ['twenty first item',
                      'twenty second item']);
});

it('lists that start with numbers', () => {
  const input = `1. 5 gold rings
2. 4 something somethings`;

  const tokens = tokenise(input);
  expect(tokens.length).toEqual(13);

  const nodes = parse(tokens);
  expect(nodes.length).toEqual(1); // ol

  expectOl(nodes[0], ['5 gold rings',
                      '4 something somethings']);
});

// todo: list with items that contain links

it('links', () => {

  let input = `[[google][title]]`;
  let tokens = tokenise(input);
  expect(tokens.length).toEqual(8);
  let nodes = parse(tokens);
  expect(nodes.length).toEqual(1);
  expect(nodes[0].type).toEqual(NoteCompiler.NodeType.PARAGRAPH);
  expect(nodes[0].children[0].type).toEqual(NoteCompiler.NodeType.LINK);
  expect(nodes[0].children[0].value).toEqual('google');
  expect(nodes[0].children[0].displayText).toEqual('title');

  input = `[[amazon.co.uk]]`;
  tokens = tokenise(input);
  expect(tokens.length).toEqual(5);
  nodes = parse(tokens);
  expect(nodes.length).toEqual(1);
  expect(nodes[0].type).toEqual(NoteCompiler.NodeType.PARAGRAPH);
  expect(nodes[0].children[0].type).toEqual(NoteCompiler.NodeType.LINK);
  expect(nodes[0].children[0].value).toEqual('amazon.co.uk');
  expect(nodes[0].children[0].displayText).toEqual('amazon.co.uk');

  input = `either: [[google.com][title here]]`;
  tokens = tokenise(input);
  expect(tokens.length).toEqual(9);
  nodes = parse(tokens);
  expect(nodes.length).toEqual(1);
  expect(nodes[0].type).toEqual(NoteCompiler.NodeType.PARAGRAPH);

  const c = nodes[0].children;
  expect(c.length).toEqual(2);
  expect(c[1].value).toEqual('google.com');
  expect(c[1].displayText).toEqual('title here');
});

it('basic ul', () => {
  const input = `- unordered item 1
- unordered item 2
- unordered item 3`;

  let tokens = tokenise(input);
  expect(tokens.length).toEqual(11);
  const nodes = parse(tokens);
  expect(nodes.length).toEqual(1);

  expectUl(nodes[0], ['unordered item 1',
                      'unordered item 2',
                      'unordered item 3']);
});

it('ul with links', () => {
  const input = `- unordered item 1
- unordered item 2 [[google.com]]
- unordered item 3`;

  let tokens = tokenise(input);
  expect(tokens.length).toEqual(16);
  const nodes = parse(tokens);
  expect(nodes.length).toEqual(1);

  const ul = nodes[0];
  expect(ul.children.length).toEqual(3);

  let li = ul.children[0];
  expect(li.type).toEqual(NoteCompiler.NodeType.LIST_ITEM);
  expect(li.children.length).toEqual(1);
  expectText(li.children[0], 'unordered item 1');

  li = ul.children[1];
  expect(li.type).toEqual(NoteCompiler.NodeType.LIST_ITEM);
  expect(li.children.length).toEqual(2);
  expectText(li.children[0], 'unordered item 2 ');
  expect(li.children[1].type).toEqual(NoteCompiler.NodeType.LINK);
  expect(li.children[1].value).toEqual('google.com');
  expect(li.children[1].displayText).toEqual('google.com');

  li = ul.children[2];
  expect(li.type).toEqual(NoteCompiler.NodeType.LIST_ITEM);
  expect(li.children.length).toEqual(1);
  expectText(li.children[0], 'unordered item 3');
});

// -----------------------------------------------------------------------------

it('multiple containers', () => {
  const input = `this is the 1st paragraph
- item a
- item b
- item c
here is the closing paragraph`;

  const tokens = tokenise(input);
  const nodes = parse(tokens);

  expect(nodes.length).toEqual(3);
  expectParagraph(nodes[0], ['this is the 1st paragraph']);
  expectUl(nodes[1], ['item a', 'item b', 'item c']);
  expectParagraph(nodes[2], ['here is the closing paragraph']);
});

it('hyphen after emphasis', () => {
  const input = `Though Aristotle wrote many elegant treatises and dialogues - Cicero described his literary style as "a river of gold" - it is thought that only around a third of his original output has survived.`;

  const tokens = tokenise(input);
  expect(tokens.length).toEqual(8);

  const nodes = parse(tokens);
  expect(nodes.length).toEqual(1);

  let p = nodes[0];

  expect(p.type).toEqual(NoteCompiler.NodeType.PARAGRAPH);
  expect(p.children.length).toEqual(4);

  expect(p.children[0].value).toEqual('Though Aristotle wrote many elegant treatises and dialogues - Cicero described his literary style as ');
  expect(p.children[1].type).toEqual(NoteCompiler.NodeType.QUOTATION);
  expect(p.children[1].children.length).toEqual(1);
  expect(p.children[1].children[0].type).toEqual(NoteCompiler.NodeType.TEXT);
  expect(p.children[1].children[0].value).toEqual('a river of gold');
  expect(p.children[2].value).toEqual(' ');
  expect(p.children[3].value).toEqual('- it is thought that only around a third of his original output has survived.');

});

it('bug: square brackets in normal text', () => {
  // non markup square brackets that happen to be in the text
  const input = `on account of the certitude and evidence of [its] reasoning`;

  const tokens = tokenise(input);
  expect(tokens.length).toEqual(6);

  const nodes = parse(tokens);
  expect(nodes.length).toEqual(1);
  expect(nodes[0].children.length).toEqual(6);
});


// -----------------------------------------------------------------------------


it('split content', () => {
  let split = null;

  split = NoteCompiler.splitContent("shabba");
  expect(split.length).toEqual(1);
  expect(split[0]).toEqual("shabba");

  split = NoteCompiler.splitContent(`hello
world`);
  expect(split.length).toEqual(2);
  expect(split[0]).toEqual("hello");
  expect(split[1]).toEqual("world");

  split = NoteCompiler.splitContent(`1st paragraph
- an item
- another item
2nd paragraph
1. an ordered item
2. another ordered item`);
  expect(split.length).toEqual(4);
  expect(split[0]).toEqual("1st paragraph");
  expect(split[1]).toEqual(`- an item
- another item`);
  expect(split[2]).toEqual("2nd paragraph");
  expect(split[3]).toEqual(`1. an ordered item
2. another ordered item`);
});

it('hash bug', () => {
  let input = '*Difference #3:*  Unlike past societies';

  let tokens = tokenise(input);
  expect(tokens.length).toEqual(8);

  let nodes = parse(tokens);
  expect(nodes.length).toEqual(1);
  expect(nodes[0].type).toEqual(NoteCompiler.NodeType.PARAGRAPH);

  const c = nodes[0].children;
  expect(c.length).toEqual(3);

  expect(c[0].type).toEqual(NoteCompiler.NodeType.STRONG);
  {
    expect(c[0].children.length).toEqual(2);
    expectText(c[0].children[0], "Difference ");
    expectText(c[0].children[1], "#3:");
  }
  expectText(c[1], "  ");
  expectText(c[2], "Unlike past societies");
});

it('link bug', () => {
  // underscore screwed up parsing
  let input = '[[https://en.wikipedia.org/wiki/Karl_Marx]]';

  let tokens = tokenise(input);
  expect(tokens.length).toEqual(7);

  let nodes = parse(tokens);
  expect(nodes.length).toEqual(1);
  expect(nodes[0].type).toEqual(NoteCompiler.NodeType.PARAGRAPH);

  const c = nodes[0].children;
  expect(c.length).toEqual(1);
  expect(c[0].type).toEqual(NoteCompiler.NodeType.LINK);
  expect(c[0].value).toEqual('https://en.wikipedia.org/wiki/Karl_Marx');
  expect(c[0].displayText).toEqual('https://en.wikipedia.org/wiki/Karl_Marx');
});

it('one caret bug', () => {
  let input = 'number 8 is 2^3 pronounced two to the power three';

  let tokens = tokenise(input);
  expect(tokens.length).toEqual(5); // TEXT, CARET, DIGITS, WHITESPACE, TEXT

  let nodes = parse(tokens);
  expect(nodes.length).toEqual(1);
  expect(nodes[0].type).toEqual(NoteCompiler.NodeType.PARAGRAPH);

  const c = nodes[0].children;
  expect(c.length).toEqual(2);

  expectText(c[0], "number 8 is 2");
  expectText(c[1], "^3 pronounced two to the power three");
});

it('backticks', () => {
  let input = `\`\`\`
this is unspecified code
\`\`\``;

  let tokens = tokenise(input);
  expect(tokens.length).toEqual(9);

  let nodes = parse(tokens);
  expect(nodes.length).toEqual(1);
  let codeblock = nodes[0];
  expect(codeblock.language).toEqual('unspecified-language');
  expect(codeblock.code).toEqual('this is unspecified code');

  // --------------------------------------------------------------------------------

  input = `\`\`\`rust
impl From<MarginConnectionToDeck> for decks_interop::MarginConnection {
    fn from(e: MarginConnectionToDeck) -> decks_interop::MarginConnection {
        let resource = kind_to_resource(e.kind.as_ref()).unwrap();
        decks_interop::MarginConnection {
            note_id: e.note_id,
            id: e.id,
            name: e.name,
            resource: resource.to_string(),
        }
    }
}

fn is_deck_associated_with_note(
    new_deck_id: Key,
    existing_decks: &[MarginConnectionToDeck],
) -> bool {
    for existing in existing_decks {
        if existing.id == new_deck_id {
            return true;
        }
    }
    false
}
\`\`\``;

  tokens = tokenise(input);
  nodes = parse(tokens);
  expect(nodes.length).toEqual(1);
  codeblock = nodes[0];
  expect(codeblock.language).toEqual('rust');
  expect(codeblock.code).toEqual(`impl From<MarginConnectionToDeck> for decks_interop::MarginConnection {
    fn from(e: MarginConnectionToDeck) -> decks_interop::MarginConnection {
        let resource = kind_to_resource(e.kind.as_ref()).unwrap();
        decks_interop::MarginConnection {
            note_id: e.note_id,
            id: e.id,
            name: e.name,
            resource: resource.to_string(),
        }
    }
}

fn is_deck_associated_with_note(
    new_deck_id: Key,
    existing_decks: &[MarginConnectionToDeck],
) -> bool {
    for existing in existing_decks {
        if existing.id == new_deck_id {
            return true;
        }
    }
    false
}`);
});

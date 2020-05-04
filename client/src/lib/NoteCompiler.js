import React from 'react';

let sidenoteCounter = 0;

class Token {
  constructor(type, value = undefined) {
    this.type = type;
    this.value = value;
  }
}

const TokenType = {
  ASTERISK:      Symbol('ASTERISK'),
  BACKTICK:      Symbol('BACKTICK'),
  BRACKET_END:   Symbol('BRACKET_END'),
  BRACKET_START: Symbol('BRACKET_START'),
  CARET:         Symbol('CARET'),
  DIGITS:        Symbol('DIGITS'),
  DOUBLEQUOTE:   Symbol('DOUBLEQUOTE'),
  HASH:          Symbol('HASH'),
  HYPHEN:        Symbol('HYPHEN'),
  NEWLINE:       Symbol('NEWLINE'),
  PERIOD:        Symbol('PERIOD'),
  PIPE:          Symbol('PIPE'),
  TEXT:          Symbol('TEXT'),
  UNDERSCORE:    Symbol('UNDERSCORE'),
  WHITESPACE:    Symbol('WHITESPACE')
};

function characterSet(string) {
  // returns the set of characters in the given string
  return string.split('').reduce((a, b) => a.add(b), new Set());
}

const sWhitespaceSet = characterSet(' \t\r');
const sDigitSet = characterSet('0123456789');

const isAsterisk     = c => c === '*';
const isBacktick     = c => c === '`';
const isBracketEnd   = c => c === ']';
const isBracketStart = c => c === '[';
const isCaret        = c => c === '^';
const isDigit        = c => sDigitSet.has(c);
const isDoubleQuote  = c => c === '"';
const isHash         = c => c === '#';
const isHyphen       = c => c === '-';
const isNewline      = c => c === '\n';
const isPeriod       = c => c === '.';
const isPipe         = c => c === '|';
const isUnderscore   = c => c === '_';
const isWhitespace   = c => sWhitespaceSet.has(c);

function consumeText(s) {
  let i = 0;
  for (i = 0; i < s.length; i++) {
    if (isNewline(s[i])
        || isBracketStart(s[i])
        || isBracketEnd(s[i])
        || isUnderscore(s[i])
        || isAsterisk(s[i])
        || isBacktick(s[i])
        || isCaret(s[i])
        || isDoubleQuote(s[i])
        || isPipe(s[i])
        || isHash(s[i])) {
      break;
    }
  }
  const token = new Token(TokenType.TEXT, s.substring(0, i));
  return [token, s.substring(i, s.length)];
}

function consumeCharacterSeq(s, checkFn, tokenType) {
  let i = 0;
  for (i = 0; i < s.length; i++) {
    if (!checkFn(s[i])) {
      break;
    }
  }
  const token = new Token(tokenType, s.substring(0, i));
  return [token, s.substring(i, s.length)];
}

function consumeCharacter(s, c, tokenType) {
  return [new Token(tokenType, c), s.substring(1)];
}

function tokenise(input) {
  const q = [];   // queue of tokens to return
  let p = [];   // [token, remaining] pair

  let s = input;

  while (s.length > 0) {
    const c = s[0];
    if (isWhitespace(c))        { p = consumeCharacterSeq(s, isWhitespace, TokenType.WHITESPACE); }
    else if (isDigit(c))        { p = consumeCharacterSeq(s, isDigit,      TokenType.DIGITS); }
    else if (isNewline(c))      { p = consumeCharacterSeq(s, isNewline,    TokenType.NEWLINE); }
    else if (isAsterisk(c))     { p = consumeCharacter(s, '*', TokenType.ASTERISK); }
    else if (isBacktick(c))     { p = consumeCharacter(s, '`', TokenType.BACKTICK); }
    else if (isBracketEnd(c))   { p = consumeCharacter(s, ']', TokenType.BRACKET_END); }
    else if (isBracketStart(c)) { p = consumeCharacter(s, '[', TokenType.BRACKET_START); }
    else if (isCaret(c))        { p = consumeCharacter(s, '^', TokenType.CARET); }
    else if (isDoubleQuote(c))  { p = consumeCharacter(s, '"', TokenType.DOUBLEQUOTE); }
    else if (isHash(c))         { p = consumeCharacter(s, '#', TokenType.HASH); }
    else if (isHyphen(c))       { p = consumeCharacter(s, '-', TokenType.HYPHEN); }
    else if (isPeriod(c))       { p = consumeCharacter(s, '.', TokenType.PERIOD); }
    else if (isPipe(c))         { p = consumeCharacter(s, '|', TokenType.PIPE); }
    else if (isUnderscore(c))   { p = consumeCharacter(s, '_', TokenType.UNDERSCORE); }
    else                        { p = consumeText(s); }

    const [token, remaining] = p;

    q.push(token);
    s = remaining;
  }

  return { tokens: q };
}

// LEXER ENDS HERE

// PARSER BEGINS

const NodeType = {
  CODEBLOCK:      Symbol('CODEBLOCK'),
  HIGHLIGHT:      Symbol('HIGHLIGHT'),
  LINK:           Symbol('LINK'),
  LIST_ITEM:      Symbol('LIST_ITEM'),
  MARGINNOTE:     Symbol('MARGINNOTE'),
  ORDERED_LIST:   Symbol('ORDERED_LIST'),
  PARAGRAPH:      Symbol('PARAGRAPH'),
  QUOTATION:      Symbol('QUOTATION'),
  SIDENOTE:       Symbol('SIDENOTE'),
  STRONG:         Symbol('STRONG'),
  TEXT:           Symbol('TEXT'),
  UNDERLINED:     Symbol('UNDERLINED'),
  UNORDERED_LIST: Symbol('UNORDERED_LIST')
};

class Node {
  constructor(type, value) {
    this.type = type;
    this.value = value;
  }
}

class NodeLink extends Node {
  constructor(url, displayText) {
    super(NodeType.LINK, url);
    this.displayText = displayText;
  }
}

class NodeList extends Node {
  constructor(type) {
    super(type);

    this.children = [];
  }

  addChild(child) {
    this.children.push(child);
  }

  getChild(nth) {
    return this.children[nth];
  }

  size() {
    return this.children.length;
  }
}

class NodeCodeblock extends Node {
  constructor() {
    super(NodeType.CODEBLOCK);

    this.language = 'unspecified-language';
    this.code = '';
  }
}

function boxNode(nodeType, value) {
  return {node: new Node(nodeType, value)};
}

function eatText(tokens) {
  let token = tokens[0];
  let value = "";

  while (token.type === TokenType.TEXT
         || token.type === TokenType.DIGITS
         || token.type === TokenType.WHITESPACE
         || token.type === TokenType.PERIOD
         || token.type === TokenType.HYPHEN) {

    value += token.value;

    tokens.shift();
    if (tokens.length === 0) {
      break;
    }
    token = tokens[0];
  }

  return boxNode(NodeType.TEXT, value);
}

function eatTextUntil(tokens, tokenType) {
  let token = tokens[0];
  let value = "";

  while (token.type !== tokenType) {

    value += token.value;

    tokens.shift();
    if (tokens.length === 0) {
      break;
    }
    token = tokens[0];
  }

  return boxNode(NodeType.TEXT, value);
}

function eatTextIncluding(tokens, tokenType) {
  let token = tokens[0];
  let value = "";
  let foundOne = false;

  while (token.type === TokenType.TEXT
         || token.type === TokenType.DIGITS
         || token.type === TokenType.WHITESPACE
         || token.type === TokenType.PERIOD
         || token.type === TokenType.HYPHEN
         || (token.type === tokenType && !foundOne)) {

    value += token.value;

    tokens.shift();
    if (tokens.length === 0) {
      break;
    }
    token = tokens[0];

    if (token.type === tokenType) {
      foundOne = true;
    }
  }

  return boxNode(NodeType.TEXT, value);
}

function eatWhitespace(tokens) {
  let token = tokens[0];
  let value = token.value;
  tokens.shift();
  return boxNode(NodeType.TEXT, value);
}

function eatListofTypeUntil(tokens, listType, tokenType) {
  const container = new NodeList(listType);

  tokens.shift();

  while(tokens.length > 0 && tokens[0].type !== tokenType) {
    const content = eatItem(tokens);
    if (content.node === undefined) {
      console.log('error with eatListofTypeUntil eatItem');
      return content;
    }

    container.addChild(content.node);
  }

  if (tokens.length === 0) {
    console.log('eatListofTypeUntil error');
    return { error: `expecting a token of ${tokenType}`};
  }

  tokens.shift();

  return { node: container };
}

function eatToNewline(tokens, container) {
  while (tokens.length !== 0) {

    if (tokens[0].type === TokenType.NEWLINE) {
      while(tokens.length > 0 && tokens[0].type === TokenType.NEWLINE) {
        tokens.shift();
      }
      return { node: container };
    }

    const nodeBox = eatItem(tokens);

    if (nodeBox.error) {
      console.log('error in eatToNewline');
      return null;
    }

    if (nodeBox.node) {
      container.addChild(nodeBox.node);
    }
  }

  // at the end of the tokens, but treat it as reaching a newline
  return { node: container };
}

function isCodeblock(tokens) {
  let tokLength = tokens.length;
  return tokLength > 5
    && tokens[0].type === TokenType.BACKTICK
    && tokens[1].type === TokenType.BACKTICK
    && tokens[2].type === TokenType.BACKTICK
    && tokens[tokLength - 1].type === TokenType.BACKTICK
    && tokens[tokLength - 2].type === TokenType.BACKTICK
    && tokens[tokLength - 3].type === TokenType.BACKTICK;
}

function isCodeblockStart(tokens) {
  let tokLength = tokens.length;
  return tokLength > 3
    && tokens[0].type === TokenType.BACKTICK
    && tokens[1].type === TokenType.BACKTICK
    && tokens[2].type === TokenType.BACKTICK;
}

function isNumberedListItem(tokens) {
  return tokens.length > 2
    && tokens[0].type === TokenType.DIGITS
    && tokens[1].type === TokenType.PERIOD
    && tokens[2].type === TokenType.WHITESPACE;
}

function isUnorderedListItem(tokens) {
  return tokens.length > 1
    && tokens[0].type === TokenType.HYPHEN
    && tokens[1].type === TokenType.WHITESPACE;
}

function eatLink(tokens) {
  // definitely something that looks like a link
  tokens.shift();               // first [
  tokens.shift();               // second [

  const url = eatTextUntil(tokens, TokenType.BRACKET_END).node;
  let display = url;

  // this should be a closing bracket
  let token = tokens[0];
  if (token.type !== TokenType.BRACKET_END) {
    console.log('eatLink error');
    return { error: 'expecting a closing bracket'};
  }
  tokens.shift();               // move past the first closing bracket

  token = tokens[0];
  if (token.type === TokenType.BRACKET_END) {
    // the url is also the display name
    tokens.shift();             // move past the second closing bracket
  } else if (token.type === TokenType.BRACKET_START) {
    tokens.shift();             // move past the second opening bracket
    display = eatItem(tokens).node;

    if (tokens[0].type === TokenType.BRACKET_END) {
      tokens.shift();             // move past the second closing bracket
    }
    if (tokens[0].type === TokenType.BRACKET_END) {
      tokens.shift();             // move past the third closing bracket
    }

  } else {
    return { error: 'expecting a bracket'};
  }

  const node = new NodeLink(url.value, display.value);

  return { node };
}

function remainingTokensContain(tokens, tokenType) {
  if (tokens.length === 1) {
    return false;
  }

  for (let i = 1;i < tokens.length; i++) {
    if (tokens[i].type === tokenType) {
      return true;
    }
  }

  return false;
}

function eatMatchingPair(tokens, tokenType, nodeType) {
    if (remainingTokensContain(tokens, tokenType)) {
      return eatListofTypeUntil(tokens, nodeType, tokenType);
    } else {
      return eatTextIncluding(tokens, tokenType);
    }
}

function eatCodeblock(tokens) {
  let tokLength = tokens.length;

  if (tokLength < 6 || (tokens[1].type !== TokenType.BACKTICK || tokens[2].type !== TokenType.BACKTICK)) {
    // expecting triple backticks to start and end the codeblock
    return eatTextIncluding(tokens, TokenType.BACKTICK);
  }

  const container = new NodeCodeblock();

  tokens.shift(); tokens.shift(); tokens.shift();  // opening backticks

  // if theres a word on the same line as the opening backticks, treat it as the descriptor for the code language
  while(tokens[0].type === TokenType.WHITESPACE) {
    tokens.shift();
  }
  if (tokens[0].type !== TokenType.NEWLINE) {
    // treat this as the language specifier
    let language = eatText(tokens).node;
    container.language = language.value;
  }

  let code = '';
  while(tokens.length > 0 && tokens[0].type !== TokenType.BACKTICK) {
    code += tokens[0].value;
    tokens.shift();
  }

  container.code = code.trim();

  if (tokens.length < 3) {
    console.log('eatCodeblock error');
    return { error: `eatCodeblock`};
  }

  if (tokens[0].type !== TokenType.BACKTICK || tokens[1].type !== TokenType.BACKTICK || tokens[2].type !== TokenType.BACKTICK) {
    console.log('eatCodeblock error: expected closing triple of backticks');
    return { error: 'eatCodeblock error: expected closing triple of backticks'};
  }

  tokens.shift(); tokens.shift(); tokens.shift();  // closing backticks

  return { node: container };
}

function eatPipe(tokens) {
    if (tokens[1] && tokens[1].type === TokenType.PIPE) {
      // two pipes, treat this as text (e.g. could be part of code snippet)
      return eatTextIncluding(tokens, TokenType.PIPE);
    } else if (remainingTokensContain(tokens, TokenType.PIPE)) {
      if (tokens[1] && tokens[1].type === TokenType.HASH) {
        tokens.shift();               // eat the opening PIPE,
                                      // eatListofTypeUntil will then eat the HASH
        return eatListofTypeUntil(tokens, NodeType.MARGINNOTE, TokenType.PIPE);

      } else {
        return eatListofTypeUntil(tokens, NodeType.SIDENOTE, TokenType.PIPE);
      }
    } else {
      return eatTextIncluding(tokens, TokenType.PIPE);
    }
}

function eatBracketStart(tokens) {
    if (tokens[1] && (tokens[1].type === TokenType.BRACKET_START)) {
      return eatLink(tokens);
    } else {
      // just some text that has a '[' in it
      tokens.shift();
      return boxNode(NodeType.TEXT, '[');
    }
}

function eatBracketEndAsText(tokens) {
    // just some text that has a ']' in it
    tokens.shift();
    return boxNode(NodeType.TEXT, ']');

}

function eatItem(tokens) {
  switch(tokens[0].type) {
  case TokenType.ASTERISK:      return eatMatchingPair(tokens, TokenType.ASTERISK, NodeType.STRONG);
  case TokenType.BACKTICK:      return eatCodeblock(tokens);
  case TokenType.BRACKET_END:   return eatBracketEndAsText(tokens);
  case TokenType.BRACKET_START: return eatBracketStart(tokens);
  case TokenType.CARET:         return eatMatchingPair(tokens, TokenType.CARET, NodeType.HIGHLIGHT);
  case TokenType.DOUBLEQUOTE:   return eatMatchingPair(tokens, TokenType.DOUBLEQUOTE, NodeType.QUOTATION);
  case TokenType.HASH:          return eatTextIncluding(tokens, TokenType.HASH);
  case TokenType.PIPE:          return eatPipe(tokens);
  case TokenType.UNDERSCORE:    return eatMatchingPair(tokens, TokenType.UNDERSCORE, NodeType.UNDERLINED);
  case TokenType.WHITESPACE:    return eatWhitespace(tokens);
  default:                      return eatText(tokens);
  }
}

function eatParagraph(tokens) {
  const container = new NodeList(NodeType.PARAGRAPH);

  const res = eatToNewline(tokens, container);

  return res;
}

// assuming that we're definitely at a  list item
function eatOrderedList(tokens) {
  const container = new NodeList(NodeType.ORDERED_LIST);

  while(tokens.length !== 0) {

    tokens.shift();               // digits
    tokens.shift();               // period
    tokens.shift();               // whitespace

    let res = eatToNewline(tokens, new NodeList(NodeType.LIST_ITEM));

    if (res.node) {
      container.addChild(res.node);
    }

    if (!isNumberedListItem(tokens)) {
      return { node: container };
    }
  }

  return { node: container };
}

function eatUnorderedList(tokens) {
  const container = new NodeList(NodeType.UNORDERED_LIST);

  while(tokens.length !== 0) {
    tokens.shift();               // hyphen
    tokens.shift();               // whitespace

    let res = eatToNewline(tokens, new NodeList(NodeType.LIST_ITEM));

    if (res.node) {
      container.addChild(res.node);
    }

    if (!isUnorderedListItem(tokens)) {
      return { node: container };
    }
  }

  return { node: container };
}

function skipLeadingWhitespace(tokens) {
  while (tokens.length > 0 && (tokens[0].type === TokenType.WHITESPACE ||
                               tokens[0].type === TokenType.NEWLINE)) {
    tokens.shift();
  }
}

function parse(tokens) {
  const nodes = [];
  let container = null;

  skipLeadingWhitespace(tokens);

  while (tokens.length !== 0) {
    if (isNumberedListItem(tokens)) {
      container = eatOrderedList(tokens).node;
    } else if (isUnorderedListItem(tokens)) {
      container = eatUnorderedList(tokens).node;
    } else if (isCodeblock(tokens)) {
      container = eatCodeblock(tokens).node;
    } else {
      container = eatParagraph(tokens).node;
    }

    nodes.push(container);
  }

  return {nodes};
}

// PARSER ENDS HERE

// COMPILER BEGINS HERE

function compileChildren(node) {
  return node.children.flatMap((e, i) => { return compile(e, i);});
}

function compileSidenote(node) {
  let c = sidenoteCounter;
  let id = `sn-${c}`;

  sidenoteCounter += 3;
  return (
    [
      <label key={ c } className="margin-toggle sidenote-number" htmlFor={ id }></label>,
      <input key={ c + 1 }type="checkbox" id={ id } className="margin-toggle"/>,
      <span key={ c + 2} className="sidenote">{ compileChildren(node) }</span>
    ]
  );
}

function compileMarginnote(node) {
    let c = sidenoteCounter;
    let id = `mn-${c}`;

    sidenoteCounter += 3;
    return (
      [
        <label key={ c } className="margin-toggle" htmlFor={ id }>&#8855;</label>,
        <input key={ c + 1 }type="checkbox" id={ id } className="margin-toggle"/>,
        <span key={ c + 2} className="marginnote">{ compileChildren(node) }</span>
      ]
    );
}

function compile(node, i) {
  switch(node.type) {
  case NodeType.TEXT:           return node.value;
  case NodeType.CODEBLOCK:      return [<pre><code className={ node.language }>{ node.code }</code></pre>];
  case NodeType.LINK:           return [<a key={i} href={ node.value }>{ node.displayText }</a>];
  case NodeType.STRONG:         return [<strong key={i}> { compileChildren(node) } </strong>];
  case NodeType.HIGHLIGHT:      return [<mark key={i}> { compileChildren(node) } </mark>];
  case NodeType.UNDERLINED:     return [<span className="underlined" key={i}> { compileChildren(node) } </span>];
  case NodeType.QUOTATION:      return [<em key={i}> { compileChildren(node) } </em>];
  case NodeType.PARAGRAPH:      return [<p key={i}> { compileChildren(node) } </p>];
  case NodeType.ORDERED_LIST:   return [<ol key={i}> { compileChildren(node) } </ol>];
  case NodeType.UNORDERED_LIST: return [<ul key={i}> { compileChildren(node) } </ul>];
  case NodeType.LIST_ITEM:      return [<li key={i}> { compileChildren(node) } </li>];
  case NodeType.SIDENOTE:       return compileSidenote(node);
  case NodeType.MARGINNOTE:     return compileMarginnote(node);
  default:                      return null;
  }
}

function compileTopLevel(ast) {
  return ast.flatMap((e, i) => compile(e, i));
}

// COMPILER ENDS HERE

function moveHeadOntoString(str, tokens) {
  str += tokens[0].value;
  tokens.shift();
  return str;
}

function movePastNewline(tokens) {
  while (tokens.length !== 0) {
    if (tokens[0].type === TokenType.NEWLINE) {
      tokens.shift();
    } else {
      return;
    }
  }
}

function joinPastNewline(str, tokens) {
  while (tokens.length !== 0) {
    if (tokens[0].type === TokenType.NEWLINE) {
      movePastNewline(tokens);
      return str;
    }
    str = moveHeadOntoString(str, tokens);
  }
  return str;
}

function joinOrderedList(tokens) {
  let s = "";
  while(tokens.length !== 0) {

    s = moveHeadOntoString(s, tokens); // digits
    s = moveHeadOntoString(s, tokens); // period
    s = moveHeadOntoString(s, tokens); // whitespace

    s = joinPastNewline(s, tokens);

    if (isNumberedListItem(tokens)) {
      s += '\n';
    } else {
      return s;
    }
  }
  return s;
}

function joinCodeblock(tokens) {
  let s = "";
  while(tokens.length !== 0) {
    s = moveHeadOntoString(s, tokens);
  }
  return s;
}

function joinUnorderedList(tokens) {
  let s = "";
  while(tokens.length !== 0) {

    s = moveHeadOntoString(s, tokens); // hyphen
    s = moveHeadOntoString(s, tokens); // whitespace

    s = joinPastNewline(s, tokens);

    if (isUnorderedListItem(tokens)) {
      s += '\n';
    } else {
      return s;
    }
  }
  return s;
}

function joinParagraph(tokens) {
  return joinPastNewline("", tokens);
}

function splitContent(content) {
  let tokensRes = tokenise(content);
  if (tokensRes.tokens === undefined) {
    console.log(`Error tokenising ${content} in splitContent`);
    return null;
  }

  let tokens = tokensRes.tokens;
  let container = null;
  const notes = [];

  skipLeadingWhitespace(tokens);
  while (tokens.length !== 0) {

    if (isNumberedListItem(tokens)) {
      container = joinOrderedList(tokens);
    } else if (isUnorderedListItem(tokens)) {
      container = joinUnorderedList(tokens);
    } else if (isCodeblockStart(tokens)) {
      container = joinCodeblock(tokens);
    } else {
      container = joinParagraph(tokens);
    }

    notes.push(container);
  }

  return notes;
}

const NoteCompiler = {
  NodeType,
  splitContent: content => {
    return splitContent(content);
  },
  tokenise: content => {
    return tokenise(content);
  },
  setSidenoteCounter: value => {
    sidenoteCounter = value;
  },
  parse: tokens => {
    const ast = parse(tokens);
    return ast;
  },
  compile: ast => {
    return compileTopLevel(ast);
  },
  make: content => {
    const tokensRes = tokenise(content);
    if (tokensRes.tokens === undefined) {
      console.log(`Error tokenising: "${content}"`);
      return null;
    }
    const tokens = tokensRes.tokens;

    const parserRes = parse(tokens);
    if (parserRes.nodes === undefined) {
      console.log(`Error parsing: "${tokens}"`);
      return null;
    }

    const ast = parserRes.nodes;
    const dom = compileTopLevel(ast);

    return dom;
  }
};

export default NoteCompiler;

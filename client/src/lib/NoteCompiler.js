import React from 'react';

let sidenoteCounter = 0;

class Token {
  constructor(type, value = undefined) {
    this.type = type;
    this.value = value;
  }
}

const TokenType = {
  TEXT: Symbol('TEXT'),
  BRACKET_START: Symbol('BRACKET_START'),
  BRACKET_END: Symbol('BRACKET_END'),
  DOUBLEQUOTE: Symbol('DOUBLEQUOTE'),
  PIPE: Symbol('PIPE'),
  DIGITS: Symbol('DIGITS'),
  PERIOD: Symbol('PERIOD'),
  CARET: Symbol('CARET'),
  HYPHEN: Symbol('HYPHEN'),
  UNDERSCORE: Symbol('UNDERSCORE'),
  ASTERISK: Symbol('ASTERISK'),
  NEWLINE: Symbol('NEWLINE'),
  WHITESPACE: Symbol('WHITESPACE')
};

function characterSet(string) {
  // returns the set of characters in the given string
  return string.split('').reduce((a, b) => a.add(b), new Set());
}

const sWhitespaceSet = characterSet(' \t\r');
const sDigitSet = characterSet('0123456789');

function isWhitespace(character) {
  return sWhitespaceSet.has(character);
}

function isDigit(character) {
  return sDigitSet.has(character);
}

function isPeriod(character) {
  return character === '.';
}

function isBracketStart(character) {
  return character === '[';
}

function isBracketEnd(character) {
  return character === ']';
}

function isNewline(character) {
  return character === '\n';
}

function isCaret(character) {
  return character === '^';
}

function isHyphen(character) {
  return character === '-';
}

function isUnderscore(character) {
  return character === '_';
}

function isAsterisk(character) {
  return character === '*';
}

function isDoubleQuote(character) {
  return character === '"';
}

function isPipe(character) {
  return character === '|';
}

function consumeText(s) {
  let i = 0;
  for (i = 0; i < s.length; i++) {
    if (isNewline(s[i])
        || isBracketStart(s[i])
        || isBracketEnd(s[i])
        || isUnderscore(s[i])
        || isAsterisk(s[i])
        || isCaret(s[i])
        || isDoubleQuote(s[i])
        || isPipe(s[i])) {
      break;
    }
  }
  const token = new Token(TokenType.TEXT, s.substring(0, i));
  return [token, s.substring(i, s.length)];
}

function consumeWhitespace(s) {
  let i = 0;
  for (i = 0; i < s.length; i++) {
    if (!isWhitespace(s[i])) {
      break;
    }
  }
  const token = new Token(TokenType.WHITESPACE, s.substring(0, i));
  return [token, s.substring(i, s.length)];
}

function consumeNewline(s) {
  let i = 0;
  for (i = 0; i < s.length; i++) {
    if (!isNewline(s[i])) {
      break;
    }
  }
  const token = new Token(TokenType.NEWLINE, s.substring(0, i));
  return [token, s.substring(i, s.length)];
}

function consumeDigits(s) {
  let i = 0;
  for (i = 0; i < s.length; i++) {
    if (!isDigit(s[i])) {
      break;
    }
  }
  const token = new Token(TokenType.DIGITS, s.substring(0, i));
  return [token, s.substring(i, s.length)];
}

function consumePeriod(s) {
  return [new Token(TokenType.PERIOD, '.'), s.substring(1)];
}

function consumeBracketStart(s) {
  return [new Token(TokenType.BRACKET_START, '['), s.substring(1)];
}

function consumeBracketEnd(s) {
  return [new Token(TokenType.BRACKET_END, ']'), s.substring(1)];
}

function consumeCaret(s) {
  return [new Token(TokenType.CARET, '^'), s.substring(1)];
}

function consumeHyphen(s) {
  return [new Token(TokenType.HYPHEN, '-'), s.substring(1)];
}

function consumeUnderscore(s) {
  return [new Token(TokenType.UNDERSCORE, '_'), s.substring(1)];
}

function consumeAsterisk(s) {
  return [new Token(TokenType.ASTERISK, '*'), s.substring(1)];
}

function consumeDoubleQuote(s) {
  return [new Token(TokenType.DOUBLEQUOTE, '"'), s.substring(1)];
}

function consumePipe(s) {
  return [new Token(TokenType.PIPE, '|'), s.substring(1)];
}

function nextTokenType(s) {
  const c = s[0];

  if (isWhitespace(c)) {
    return TokenType.WHITESPACE;
  }

  if (isDigit(c)) {
    return TokenType.DIGITS;
  }

  if (isPeriod(c)) {
    return TokenType.PERIOD;
  }

  if (isNewline(c)) {
    return TokenType.NEWLINE;
  }

  if (isCaret(c)) {
    return TokenType.CARET;
  }

  if (isHyphen(c)) {
    return TokenType.HYPHEN;
  }

  if (isUnderscore(c)) {
    return TokenType.UNDERSCORE;
  }

  if (isAsterisk(c)) {
    return TokenType.ASTERISK;
  }

  if (isDoubleQuote(c)) {
    return TokenType.DOUBLEQUOTE;
  }

  if (isPipe(c)) {
    return TokenType.PIPE;
  }

  if (isBracketStart(c)) {
    return TokenType.BRACKET_START;
  }

  if (isBracketEnd(c)) {
    return TokenType.BRACKET_END;
  }

  return TokenType.TEXT;
}

function tokenise(input) {
  const q = [];   // queue of tokens to return
  let p = [];   // [token, remaining] pair

  let s = input;

  while (s.length > 0) {
    switch (nextTokenType(s)) {
    case TokenType.TEXT :
      p = consumeText(s);
      break;
    case TokenType.DIGITS :
      p = consumeDigits(s);
      break;
    case TokenType.PERIOD :
      p = consumePeriod(s);
      break;
    case TokenType.WHITESPACE :
      p = consumeWhitespace(s);
      break;
    case TokenType.NEWLINE :
      p = consumeNewline(s);
      break;
    case TokenType.BRACKET_START :
      p = consumeBracketStart(s);
      break;
    case TokenType.BRACKET_END :
      p = consumeBracketEnd(s);
      break;
    case TokenType.CARET :
      p = consumeCaret(s);
      break;
    case TokenType.HYPHEN :
      p = consumeHyphen(s);
      break;
    case TokenType.UNDERSCORE :
      p = consumeUnderscore(s);
      break;
    case TokenType.ASTERISK :
      p = consumeAsterisk(s);
      break;
    case TokenType.DOUBLEQUOTE :
      p = consumeDoubleQuote(s);
      break;
    case TokenType.PIPE :
      p = consumePipe(s);
      break;
    default:
      // read the unknown token and return it
      console.log("unknown token");
      console.log(s);
      console.log(nextTokenType(s));
      // const tok = consumeUnknown(s)[0];
      // return {error: `unknown token: ${tok.value}`,
      //         tokens: [tok]};
      return {};
    }

    const [token, remaining] = p;

    q.push(token);
    s = remaining;
  }

  return {tokens: q};
}

// LEXER ENDS HERE

// PARSER BEGINS

const NodeType = {
  PARAGRAPH: Symbol('PARAGRAPH'),
  ORDERED_LIST: Symbol('ORDERED_LIST'),
  UNORDERED_LIST: Symbol('UNORDERED_LIST'),
  LIST_ITEM: Symbol('LIST_ITEM'),
  TEXT: Symbol('TEXT'),
  LINK: Symbol('LINK'),
  QUOTATION: Symbol('QUOTATION'),
  SIDENOTE: Symbol('SIDENOTE'),
  UNDERLINED: Symbol('UNDERLINED'),
  STRONG: Symbol('STRONG'),
  HIGHLIGHT: Symbol('HIGHLIGHT')
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

function eatHighlight(tokens) {
  return eatListofTypeUntil(tokens, NodeType.HIGHLIGHT, TokenType.CARET);
}

function eatStrong(tokens) {
  return eatListofTypeUntil(tokens, NodeType.STRONG, TokenType.ASTERISK);
}

function eatUnderline(tokens) {
  return eatListofTypeUntil(tokens, NodeType.UNDERLINED, TokenType.UNDERSCORE);
}

function eatQuotation(tokens) {
  return eatListofTypeUntil(tokens, NodeType.QUOTATION, TokenType.DOUBLEQUOTE);
}

function eatHyperlink(tokens) {
  return eatListofTypeUntil(tokens, NodeType.SIDENOTE, TokenType.PIPE);
}

function eatNewlines(tokens) {
  while(tokens.length > 0 && tokens[0].type === TokenType.NEWLINE) {
    tokens.shift();
  }
}

function eatToNewline(tokens, container) {
  while (tokens.length !== 0) {

    if (tokens[0].type === TokenType.NEWLINE) {
      eatNewlines(tokens);
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

  const url = eatItem(tokens).node;
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

function eatItem(tokens) {
  const token = tokens[0];

  const tokenType = token.type;

  if (tokenType === TokenType.BRACKET_START) {
    if (tokens[1] && (tokens[1].type === TokenType.BRACKET_START)) {
      return eatLink(tokens);
    } else {
      // just some text that has a '[' in it
      tokens.shift();
      return boxNode(NodeType.TEXT, '[');
    }
  } else if (tokenType === TokenType.BRACKET_END) {
    // just some text that has a ']' in it
    tokens.shift();
    return boxNode(NodeType.TEXT, ']');
  } else if (tokenType === TokenType.DOUBLEQUOTE) {
    if (remainingTokensContain(tokens, TokenType.DOUBLEQUOTE)) {
      return eatQuotation(tokens);
    } else {
      return eatTextIncluding(tokens, TokenType.DOUBLEQUOTE);
    }
  } else if (tokenType === TokenType.UNDERSCORE) {
    if (remainingTokensContain(tokens, TokenType.UNDERSCORE)) {
      return eatUnderline(tokens);
    } else {
      return eatTextIncluding(tokens, TokenType.UNDERSCORE);
    }
  } else if (tokenType === TokenType.ASTERISK) {
    if (remainingTokensContain(tokens, TokenType.ASTERISK)) {
      return eatStrong(tokens);
    } else {
      return eatTextIncluding(tokens, TokenType.ASTERISK);
    }
  } else if (tokenType === TokenType.CARET) {
    if (remainingTokensContain(tokens, TokenType.CARET)) {
      return eatHighlight(tokens);
    } else {
      return eatTextIncluding(tokens, TokenType.ASTERISK);
    }
  } else if (tokenType === TokenType.PIPE) {
    if (tokens[1] && tokens[1].type === TokenType.PIPE) {
      // two pipes, treat this as text (e.g. could be part of code snippet)
      return eatTextIncluding(tokens, TokenType.PIPE);
    } else if (remainingTokensContain(tokens, TokenType.PIPE)) {
      return eatHyperlink(tokens);
    } else {
      return eatTextIncluding(tokens, TokenType.PIPE);
    }
  } else if (tokenType === TokenType.WHITESPACE) {
    return eatWhitespace(tokens);
  }

  return eatText(tokens);
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

function compile(node, i) {

  if (node.type === NodeType.TEXT) {
    return node.value;//.trimRight();
  } else if (node.type === NodeType.LINK) {
    return (
      [<a key={i} href={ node.value }>{ node.displayText }</a>]
    );
  } else if (node.type === NodeType.STRONG) {
    return (
      [<strong key={i}>
        { compileChildren(node) }
      </strong>]
    );
  } else if (node.type === NodeType.HIGHLIGHT) {
    return (
      [<mark key={i}>
        { compileChildren(node) }
      </mark>]
    );
  } else if (node.type === NodeType.UNDERLINED) {
    return (
      [<span className="underlined" key={i}>
        { compileChildren(node) }
      </span>]
    );
  } else if (node.type === NodeType.QUOTATION) {
    return (
      [<em key={i}>
        { compileChildren(node) }
      </em>]
    );
  } else if (node.type === NodeType.PARAGRAPH) {
    return (
      [<p key={i}>
        { compileChildren(node) }
      </p>]
    );
  } else if (node.type === NodeType.ORDERED_LIST) {
    return (
      [<ol key={i}>
        { compileChildren(node) }
      </ol>]
    );
  } else if (node.type === NodeType.UNORDERED_LIST) {
    return (
      [<ul key={i}>
        { compileChildren(node) }
      </ul>]
    );
  } else if (node.type === NodeType.LIST_ITEM) {
    return (
      [<li key={i}>
        { compileChildren(node) }
      </li>]
    );
  } else if (node.type === NodeType.SIDENOTE) {
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

  return null;
}

function compileTopLevel(ast) {
  return ast.flatMap((e, i) => { return compile(e, i);});
}

function compileMain(ast) {
  return compileTopLevel(ast);
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
  parse: tokens => {
    const ast = parse(tokens);
    return ast;
  },
  compile: ast => {
    return compileMain(ast);
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
    const dom = compileMain(ast);

    return dom;
  }
};


export default NoteCompiler;

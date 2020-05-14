// The code in this file is based on react-console-emulator, here is their license:

// MIT License

// Copyright (c) 2018 Linus Willner and Curtis Fowler

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import React, { useState, useEffect } from 'react';
import html from 'react-inner-html';
import { useStateValue } from '../lib/state';
import { asShellBlock } from '../lib/reactUtils';
import { Link, useHistory } from 'react-router-dom';
import { ensureAC } from '../lib/utils';
import Net from '../lib/Net';


export default function Console(props) {
  let history = useHistory();

  const [state, dispatch] = useStateValue();

  const [consoleRoot] = useState(React.createRef());
  const [consoleInput] = useState(React.createRef());
  const [showConsole, setShowConsole] = useState(false);

  ensureAC(state, dispatch);

  const commands = {
    goto: {
      description: 'Goto a listing page',
      usage: '!goto [ideas | publications | people | places]',
      fn: function (deck) {
        return `goto ${deck}`;
      },
      afterEffectFn: function(deck) {
        history.push(`/${deck}`);
      }
    },

    recent: {
      description: 'Display recently added items',
      usage: '!recent [ideas | publications | people | places]',
      fn: async function (deck) {
        const res = await cmdRecent(deck);
        return res;
      }
    }
  };

  let promptLabel = buildPrompt(state.user);

  function onIconClicked(event) {
    setShowConsole(!showConsole);
    if (!showConsole) {
      console.log('focusConsole called');
      focusConsole();
    }
  }

  let consoleClasses = showConsole ? 'console console-visible' : 'console console-invisible';
  let autoFocus = true;

  useEffect(() => {
    if (promptLabel !== state.console.promptLabel) {
      dispatch({
        type: 'setPromptLabel',
        promptLabel
      });
    }

    if (autoFocus) {
      focusConsole();
    }
    scrollToBottom();
  });

  function focusConsole() {
    // Only focus the console if text isn't being copied
    const isTextSelected = window.getSelection().type === 'Range';
    if (!isTextSelected) {
      // console.log(consoleInput.current);
      consoleInput.current.focus();
    }
  }

  function scrollToBottom() {
    const rootNode = consoleRoot.current;

    // This may look ridiculous, but it is necessary to decouple execution for just a millisecond in order to scroll all the way
    setTimeout(() => { rootNode.scrollTop = rootNode.scrollHeight; }, 1);
  }

  function showHelp() {

    let lines = [];
    lines.push("type in the search term at the console, additional commands can be invoked by starting a line with an exclamation point");
    lines.push("");
    lines.push(`!help - Show this message`);
    lines.push(`!clear - Clear the console`);
    for (const c in commands) {
      const cmdObj = commands[c];
      const usage = cmdObj.usage ? ` - ${cmdObj.usage}` : '';

      lines.push(`!${c} - ${cmdObj.description}${usage}`);
    }

    pushToStdout(asShellBlock(lines));
  }

  function pushToStdout(message, rawInput) {
    let action = {
      type: 'pushStdout',
      message: message
    };

    if (rawInput) { // Only supplied if history is enabled
      action.rawInput = rawInput;
    }
    dispatch(action);
  }

  function getStdout() {
    return state.console.stdout.map((line, i) => <ConsoleMessage key={i} content={line} />);
  }

  function clearInput() {
    dispatch({
      type: 'clearInput'
    });

    consoleInput.current.value = '';
  }

  function clearStdout() {
    dispatch({
      type: 'clearStdout'
    });
    consoleInput.current.value = '';
  }

  async function processCommand() {
    const rawInput = consoleInput.current.value;

    if (!props.noAutomaticStdout) {
      if (!props.noHistory) {
        pushToStdout(`${state.console.promptLabel || '$'} ${rawInput}`, rawInput);
      } else {
        pushToStdout(`${state.console.promptLabel || '$'} ${rawInput}`);
      }
    }

    const input = rawInput.split(' ');
    let commandGiven = false;
    let command = input.splice(0, 1)[0]; // Removed portion is returned...
    if (command[0] === '!') {
      command = command.slice(1);
      commandGiven = true;
    }

    const args = input; // ...and the rest can be used
    const cmdObj = commands[command];

    if (rawInput) {
      if (commandGiven === false) {
        // use rawInput as input for a search
        let res;
        try {
          res = await cmdSearch(rawInput);
        } catch(e) {
          res = e.toString();
        }
        pushToStdout(res);
      } else if (command === 'help') {
        showHelp();
      } else if (command === 'clear') {
        clearStdout();
        return;
      } else {
        if (!cmdObj) {
          pushToStdout(props.errorText ?
                       props.errorText.replace(/\[command\]/gi, command) :
                       `Command '${command}' not found!`);
        }
        else {
          let res;
          try {
            res = await cmdObj.fn(...args);
          } catch(e) {
            res = e.toString();
          }

          pushToStdout(res);
        }
      }
    }

    clearInput();
    if (!props.noAutoScroll) {
      scrollToBottom();
    }
    if (cmdObj && cmdObj.afterEffectFn) {
      cmdObj.afterEffectFn(...args);
    }
  }

  function scrollHistoryFun(direction) {
    const toUpdate = scrollHistory(
      direction,
      state.console.history,
      state.console.historyPosition,
      state.console.previousHistoryPosition,
      consoleInput,
      props.noAutomaticStdout
    );

    if (toUpdate) {
      dispatch({
        type: 'scrollHistory',
        historyPosition: toUpdate.historyPosition,
        previousHistoryPosition: toUpdate.previousHistoryPosition
      });
    }
  }

  function handleInput(event) {
    switch (event.key) {
    case 'Enter': processCommand(); break;
    case 'ArrowUp': scrollHistoryFun('up'); break;
    case 'ArrowDown': scrollHistoryFun('down'); break;
    default: return;
    }
  }

  return (
    <div className="sidebar">
      <div
        ref={consoleRoot}
        name={'react-console-emulator'}
        className={ consoleClasses }
        style={styles.container}
        onClick={focusConsole}
      >
        {/* Content */}
        <div
          name={'react-console-emulator__content'}
          className={props.contentClassName}
          style={styles.content}
        >
          {/* Stdout */}
          {getStdout()}
          {/* Input area */}
          <div
            name={'react-console-emulator__inputArea'}
            className={props.inputAreaClassName}
            style={styles.inputArea}
          >
            {/* Prompt label */}
            <span
              name={'react-console-emulator__promptLabel'}
              className={state.console.promptLabelClassName}
              style={styles.promptLabel}
            >
              {state.console.promptLabel || '$'}
            </span>
            {/* Input */}
            <input
              ref={consoleInput}
              name={'react-console-emulator__input'}
              className={props.inputClassName}
              style={styles.input}
              onKeyDown={handleInput}
              type={'text'}
              autoComplete={'off'}
              disabled={
                props.disableOnProcess && state.console.processing
              }
            />
          </div>
        </div>
      </div>
      <div className="sticky-bl">
        <svg onClick={ onIconClicked } xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="#666" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path stroke="none" d="M0 0h24v24H0z"/>
          <circle cx="12" cy="12" r="9" />
          <line x1="9" y1="10" x2="9.01" y2="10" />
          <line x1="15" y1="10" x2="15.01" y2="10" />
          <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
        </svg>
      </div>
    </div>
  );

}


const styles = {
  container: {
    minWidth: '500px',
    minHeight: '300px',
    maxWidth: '100%', // Fill parent before overflowing
    maxHeight: '100%', // Fill parent before overflowing
    borderRadius: '5px',
    overflow: 'auto',
    cursor: 'text',
    background: 'rgb(255, 255, 248, 0.9)',
    backgroundSize: 'cover'
  },
  content: {
    padding: '20px',
    height: '100%',
    fontSize: '15px',
    color: '#444444',
    fontFamily: 'monospace'
  },
  inputArea: {
    display: 'inline-flex',
    width: '100%'
  },
  promptLabel: {
    paddingTop: '3px',
    color: '#db6b2d'
  },
  input: {
    border: '0',
    padding: '0 0 0 7px',
    margin: '0',
    flexGrow: '100',
    width: '100%',
    height: '22px',
    background: 'transparent',
    fontSize: '15px',
    color: '#db6b2d',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    outline: 'none' // Fix for outline showing up on some browsers
  }
};

function scrollHistory (direction, commandHistory, historyPosition, previousHistoryPosition, consoleInput, noAutomaticStdout) {
  const history = cleanArray(commandHistory).reverse(); // Clean empty items and reverse order to ease position tracking
  const position = historyPosition;
  const previousPosition = previousHistoryPosition;
  const termNode = consoleInput.current;

  if (!noAutomaticStdout && history.length > 0) { // Only run if history is non-empty and in use
    switch (direction) {
    case 'up':
      if (position === null) {
        // If at no position, get most recent entry
        termNode.value = history[0];
        return { historyPosition: 0, previousHistoryPosition: null };
      } else if (position + 1 === history.length) {
        // If the first entry will be reached on this press, get it and decrement position by 1 to avoid confusing downscroll
        termNode.value = history[history.length - 1];
        return { historyPosition: history.length - 1, previousHistoryPosition: history.length - 2 };
      } else {
        // Normal increment by one
        termNode.value = history[position + 1];
        return { historyPosition: position + 1, previousHistoryPosition: position };
      }
    case 'down':
      if (position === null || !history[position]) {
        // If at initial or out of range, clear (Unix-like behaviour)
        termNode.value = '';
        return { historyPosition: null, previousHistoryPosition: null };
      } else if (position - 1 === -1) {
        // Clear because user pressed up once and is now pressing down again => clear or is reaching bottom
        if (previousPosition === null || (position === 0 && previousPosition === 1)) {
          termNode.value = '';
        } else {
          termNode.value = history[0];
        }
        return { historyPosition: null, previousHistoryPosition: null };
      } else {
        // Normal decrement by one
        termNode.value = history[position - 1];
        return {
          historyPosition: position - 1,
          previousHistoryPosition: position };
      }
    default:
      return undefined;
    }
  }


  return undefined;
}

function cleanArray (dirtyArray) {
  const newArray = Array.from(dirtyArray);
  return newArray.filter(i => i !== undefined);
}

function ConsoleMessage({ content, dangerMode }) {
    const message = {
      lineHeight: '21px'
    };

    return dangerMode
         ? <div style={message} {...html(content)}/>
         : <div style={message}>{content}</div>;

}

async function cmdRecent(deck) {
  const d = deck.toLowerCase();
  const whiteList = ['publications', 'people', 'events', 'ideas'];
  if (!whiteList.includes(d)) {
    return (<div className="shell-block">unknown deck specifier: { deck }</div>);
  }

  const url = `/api/cmd/recent?resource=${deck}`;
  const recentResults = await Net.get(url);
  const results = recentResults.results.map(buildRecentResultEntry);

  return asShellBlock(results);
}

async function cmdSearch(rawInput) {
  const url = `/api/cmd/search?q=${encodeURI(rawInput)}`;
  const searchResults = await Net.get(url);
  const results = searchResults.results.map(buildSearchResultEntry);

  return asShellBlock(results);
}

function buildRecentResultEntry(entry) {
  return (<Link to={ `/${entry.resource}/${entry.id}` }>{ entry.name }</Link>);
}

function buildSearchResultEntry(entry) {
  return (<Link to={ `/${entry.resource}/${entry.id}` }>{ entry.name }</Link>);
}

function buildPrompt(user) {
  let prompt = '';

  if (user && user.username) {
    prompt += `${user.username}`;
    if (user.admin) {
      let admin = user.admin;
      prompt += `@${admin.db_name}`;
    }
  }
  prompt += '->';

  return prompt;
}

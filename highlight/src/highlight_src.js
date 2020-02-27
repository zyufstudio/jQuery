/*
Syntax highlighting with language autodetection.
https://highlightjs.org/
*/

(function(factory) {

    // Find the global object for export to both the browser and web workers.
    var globalObject = typeof window === 'object' && window ||
                       typeof self === 'object' && self;
  
    // Setup highlight.js for different environments. First is Node.js or
    // CommonJS.
    if(typeof exports !== 'undefined') {
      factory(exports);
    } else if(globalObject) {
      // Export hljs globally even when using AMD for cases when this script
      // is loaded with others that may still expect a global hljs.
      globalObject.hljs = factory({});
  
      // Finally register the global hljs with AMD.
      if(typeof define === 'function' && define.amd) {
        define([], function() {
          return globalObject.hljs;
        });
      }
    }
  
  }(function(hljs) {
    // Convenience variables for build-in objects
    var ArrayProto = [],
        objectKeys = Object.keys;
  
    // Global internal variables used within the highlight.js library.
    var languages = {},
        aliases   = {};
  
    // Regular expressions used throughout the highlight.js library.
    var noHighlightRe    = /^(no-?highlight|plain|text)$/i,
        languagePrefixRe = /\blang(?:uage)?-([\w-]+)\b/i,
        fixMarkupRe      = /((^(<[^>]+>|\t|)+|(?:\n)))/gm;
  
    var spanEndTag = '</span>';
  
    // Global options used when within external APIs. This is modified when
    // calling the `hljs.configure` function.
    var options = {
      classPrefix: 'hljs-',
      tabReplace: null,
      useBR: false,
      languages: undefined
    };
  
  
    /* Utility functions */
  
    function escape(value) {
      return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  
    function tag(node) {
      return node.nodeName.toLowerCase();
    }
  
    function testRe(re, lexeme) {
      var match = re && re.exec(lexeme);
      return match && match.index === 0;
    }
  
    function isNotHighlighted(language) {
      return noHighlightRe.test(language);
    }
  
    function blockLanguage(block) {
      var i, match, length, _class;
      var classes = block.className + ' ';
  
      classes += block.parentNode ? block.parentNode.className : '';
  
      // language-* takes precedence over non-prefixed class names.
      match = languagePrefixRe.exec(classes);
      if (match) {
        return getLanguage(match[1]) ? match[1] : 'no-highlight';
      }
  
      classes = classes.split(/\s+/);
  
      for (i = 0, length = classes.length; i < length; i++) {
        _class = classes[i];
  
        if (isNotHighlighted(_class) || getLanguage(_class)) {
          return _class;
        }
      }
    }
  
    function inherit(parent) {  // inherit(parent, override_obj, override_obj, ...)
      var key;
      var result = {};
      var objects = Array.prototype.slice.call(arguments, 1);
  
      for (key in parent)
        result[key] = parent[key];
      objects.forEach(function(obj) {
        for (key in obj)
          result[key] = obj[key];
      });
      return result;
    }
  
    /* Stream merging */
  
    function nodeStream(node) {
      var result = [];
      (function _nodeStream(node, offset) {
        for (var child = node.firstChild; child; child = child.nextSibling) {
          if (child.nodeType === 3)
            offset += child.nodeValue.length;
          else if (child.nodeType === 1) {
            result.push({
              event: 'start',
              offset: offset,
              node: child
            });
            offset = _nodeStream(child, offset);
            // Prevent void elements from having an end tag that would actually
            // double them in the output. There are more void elements in HTML
            // but we list only those realistically expected in code display.
            if (!tag(child).match(/br|hr|img|input/)) {
              result.push({
                event: 'stop',
                offset: offset,
                node: child
              });
            }
          }
        }
        return offset;
      })(node, 0);
      return result;
    }
  
    function mergeStreams(original, highlighted, value) {
      var processed = 0;
      var result = '';
      var nodeStack = [];
  
      function selectStream() {
        if (!original.length || !highlighted.length) {
          return original.length ? original : highlighted;
        }
        if (original[0].offset !== highlighted[0].offset) {
          return (original[0].offset < highlighted[0].offset) ? original : highlighted;
        }
  
        /*
        To avoid starting the stream just before it should stop the order is
        ensured that original always starts first and closes last:
  
        if (event1 == 'start' && event2 == 'start')
          return original;
        if (event1 == 'start' && event2 == 'stop')
          return highlighted;
        if (event1 == 'stop' && event2 == 'start')
          return original;
        if (event1 == 'stop' && event2 == 'stop')
          return highlighted;
  
        ... which is collapsed to:
        */
        return highlighted[0].event === 'start' ? original : highlighted;
      }
  
      function open(node) {
        function attr_str(a) {return ' ' + a.nodeName + '="' + escape(a.value).replace('"', '&quot;') + '"';}
        result += '<' + tag(node) + ArrayProto.map.call(node.attributes, attr_str).join('') + '>';
      }
  
      function close(node) {
        result += '</' + tag(node) + '>';
      }
  
      function render(event) {
        (event.event === 'start' ? open : close)(event.node);
      }
  
      while (original.length || highlighted.length) {
        var stream = selectStream();
        result += escape(value.substring(processed, stream[0].offset));
        processed = stream[0].offset;
        if (stream === original) {
          /*
          On any opening or closing tag of the original markup we first close
          the entire highlighted node stack, then render the original tag along
          with all the following original tags at the same offset and then
          reopen all the tags on the highlighted stack.
          */
          nodeStack.reverse().forEach(close);
          do {
            render(stream.splice(0, 1)[0]);
            stream = selectStream();
          } while (stream === original && stream.length && stream[0].offset === processed);
          nodeStack.reverse().forEach(open);
        } else {
          if (stream[0].event === 'start') {
            nodeStack.push(stream[0].node);
          } else {
            nodeStack.pop();
          }
          render(stream.splice(0, 1)[0]);
        }
      }
      return result + escape(value.substr(processed));
    }
  
    /* Initialization */
  
    function expand_mode(mode) {
      if (mode.variants && !mode.cached_variants) {
        mode.cached_variants = mode.variants.map(function(variant) {
          return inherit(mode, {variants: null}, variant);
        });
      }
      return mode.cached_variants || (mode.endsWithParent && [inherit(mode)]) || [mode];
    }
  
    function compileLanguage(language) {
  
      function reStr(re) {
          return (re && re.source) || re;
      }
  
      function langRe(value, global) {
        return new RegExp(
          reStr(value),
          'm' + (language.case_insensitive ? 'i' : '') + (global ? 'g' : '')
        );
      }
  
      function compileMode(mode, parent) {
        if (mode.compiled)
          return;
        mode.compiled = true;
  
        mode.keywords = mode.keywords || mode.beginKeywords;
        if (mode.keywords) {
          var compiled_keywords = {};
  
          var flatten = function(className, str) {
            if (language.case_insensitive) {
              str = str.toLowerCase();
            }
            str.split(' ').forEach(function(kw) {
              var pair = kw.split('|');
              compiled_keywords[pair[0]] = [className, pair[1] ? Number(pair[1]) : 1];
            });
          };
  
          if (typeof mode.keywords === 'string') { // string
            flatten('keyword', mode.keywords);
          } else {
            objectKeys(mode.keywords).forEach(function (className) {
              flatten(className, mode.keywords[className]);
            });
          }
          mode.keywords = compiled_keywords;
        }
        mode.lexemesRe = langRe(mode.lexemes || /\w+/, true);
  
        if (parent) {
          if (mode.beginKeywords) {
            mode.begin = '\\b(' + mode.beginKeywords.split(' ').join('|') + ')\\b';
          }
          if (!mode.begin)
            mode.begin = /\B|\b/;
          mode.beginRe = langRe(mode.begin);
          if (mode.endSameAsBegin)
            mode.end = mode.begin;
          if (!mode.end && !mode.endsWithParent)
            mode.end = /\B|\b/;
          if (mode.end)
            mode.endRe = langRe(mode.end);
          mode.terminator_end = reStr(mode.end) || '';
          if (mode.endsWithParent && parent.terminator_end)
            mode.terminator_end += (mode.end ? '|' : '') + parent.terminator_end;
        }
        if (mode.illegal)
          mode.illegalRe = langRe(mode.illegal);
        if (mode.relevance == null)
          mode.relevance = 1;
        if (!mode.contains) {
          mode.contains = [];
        }
        mode.contains = Array.prototype.concat.apply([], mode.contains.map(function(c) {
          return expand_mode(c === 'self' ? mode : c);
        }));
        mode.contains.forEach(function(c) {compileMode(c, mode);});
  
        if (mode.starts) {
          compileMode(mode.starts, parent);
        }
  
        var terminators =
          mode.contains.map(function(c) {
            return c.beginKeywords ? '\\.?(' + c.begin + ')\\.?' : c.begin;
          })
          .concat([mode.terminator_end, mode.illegal])
          .map(reStr)
          .filter(Boolean);
        mode.terminators = terminators.length ? langRe(terminators.join('|'), true) : {exec: function(/*s*/) {return null;}};
      }
  
      compileMode(language);
    }
  
    /*
    Core highlighting function. Accepts a language name, or an alias, and a
    string with the code to highlight. Returns an object with the following
    properties:
  
    - relevance (int)
    - value (an HTML string with highlighting markup)
  
    */
    function highlight(name, value, ignore_illegals, continuation) {
  
      function escapeRe(value) {
        return new RegExp(value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'm');
      }
  
      function subMode(lexeme, mode) {
        var i, length;
  
        for (i = 0, length = mode.contains.length; i < length; i++) {
          if (testRe(mode.contains[i].beginRe, lexeme)) {
            if (mode.contains[i].endSameAsBegin) {
              mode.contains[i].endRe = escapeRe( mode.contains[i].beginRe.exec(lexeme)[0] );
            }
            return mode.contains[i];
          }
        }
      }
  
      function endOfMode(mode, lexeme) {
        if (testRe(mode.endRe, lexeme)) {
          while (mode.endsParent && mode.parent) {
            mode = mode.parent;
          }
          return mode;
        }
        if (mode.endsWithParent) {
          return endOfMode(mode.parent, lexeme);
        }
      }
  
      function isIllegal(lexeme, mode) {
        return !ignore_illegals && testRe(mode.illegalRe, lexeme);
      }
  
      function keywordMatch(mode, match) {
        var match_str = language.case_insensitive ? match[0].toLowerCase() : match[0];
        return mode.keywords.hasOwnProperty(match_str) && mode.keywords[match_str];
      }
  
      function buildSpan(classname, insideSpan, leaveOpen, noPrefix) {
        var classPrefix = noPrefix ? '' : options.classPrefix,
            openSpan    = '<span class="' + classPrefix,
            closeSpan   = leaveOpen ? '' : spanEndTag;
  
        openSpan += classname + '">';
  
        return openSpan + insideSpan + closeSpan;
      }
  
      function processKeywords() {
        var keyword_match, last_index, match, result;
  
        if (!top.keywords)
          return escape(mode_buffer);
  
        result = '';
        last_index = 0;
        top.lexemesRe.lastIndex = 0;
        match = top.lexemesRe.exec(mode_buffer);
  
        while (match) {
          result += escape(mode_buffer.substring(last_index, match.index));
          keyword_match = keywordMatch(top, match);
          if (keyword_match) {
            relevance += keyword_match[1];
            result += buildSpan(keyword_match[0], escape(match[0]));
          } else {
            result += escape(match[0]);
          }
          last_index = top.lexemesRe.lastIndex;
          match = top.lexemesRe.exec(mode_buffer);
        }
        return result + escape(mode_buffer.substr(last_index));
      }
  
      function processSubLanguage() {
        var explicit = typeof top.subLanguage === 'string';
        if (explicit && !languages[top.subLanguage]) {
          return escape(mode_buffer);
        }
  
        var result = explicit ?
                     highlight(top.subLanguage, mode_buffer, true, continuations[top.subLanguage]) :
                     highlightAuto(mode_buffer, top.subLanguage.length ? top.subLanguage : undefined);
  
        // Counting embedded language score towards the host language may be disabled
        // with zeroing the containing mode relevance. Usecase in point is Markdown that
        // allows XML everywhere and makes every XML snippet to have a much larger Markdown
        // score.
        if (top.relevance > 0) {
          relevance += result.relevance;
        }
        if (explicit) {
          continuations[top.subLanguage] = result.top;
        }
        return buildSpan(result.language, result.value, false, true);
      }
  
      function processBuffer() {
        result += (top.subLanguage != null ? processSubLanguage() : processKeywords());
        mode_buffer = '';
      }
  
      function startNewMode(mode) {
        result += mode.className? buildSpan(mode.className, '', true): '';
        top = Object.create(mode, {parent: {value: top}});
      }
  
      function processLexeme(buffer, lexeme) {
  
        mode_buffer += buffer;
  
        if (lexeme == null) {
          processBuffer();
          return 0;
        }
  
        var new_mode = subMode(lexeme, top);
        if (new_mode) {
          if (new_mode.skip) {
            mode_buffer += lexeme;
          } else {
            if (new_mode.excludeBegin) {
              mode_buffer += lexeme;
            }
            processBuffer();
            if (!new_mode.returnBegin && !new_mode.excludeBegin) {
              mode_buffer = lexeme;
            }
          }
          startNewMode(new_mode, lexeme);
          return new_mode.returnBegin ? 0 : lexeme.length;
        }
  
        var end_mode = endOfMode(top, lexeme);
        if (end_mode) {
          var origin = top;
          if (origin.skip) {
            mode_buffer += lexeme;
          } else {
            if (!(origin.returnEnd || origin.excludeEnd)) {
              mode_buffer += lexeme;
            }
            processBuffer();
            if (origin.excludeEnd) {
              mode_buffer = lexeme;
            }
          }
          do {
            if (top.className) {
              result += spanEndTag;
            }
            if (!top.skip && !top.subLanguage) {
              relevance += top.relevance;
            }
            top = top.parent;
          } while (top !== end_mode.parent);
          if (end_mode.starts) {
            if (end_mode.endSameAsBegin) {
              end_mode.starts.endRe = end_mode.endRe;
            }
            startNewMode(end_mode.starts, '');
          }
          return origin.returnEnd ? 0 : lexeme.length;
        }
  
        if (isIllegal(lexeme, top))
          throw new Error('Illegal lexeme "' + lexeme + '" for mode "' + (top.className || '<unnamed>') + '"');
  
        /*
        Parser should not reach this point as all types of lexemes should be caught
        earlier, but if it does due to some bug make sure it advances at least one
        character forward to prevent infinite looping.
        */
        mode_buffer += lexeme;
        return lexeme.length || 1;
      }
  
      var language = getLanguage(name);
      if (!language) {
        throw new Error('Unknown language: "' + name + '"');
      }
  
      compileLanguage(language);
      var top = continuation || language;
      var continuations = {}; // keep continuations for sub-languages
      var result = '', current;
      for(current = top; current !== language; current = current.parent) {
        if (current.className) {
          result = buildSpan(current.className, '', true) + result;
        }
      }
      var mode_buffer = '';
      var relevance = 0;
      try {
        var match, count, index = 0;
        while (true) {
          top.terminators.lastIndex = index;
          match = top.terminators.exec(value);
          if (!match)
            break;
          count = processLexeme(value.substring(index, match.index), match[0]);
          index = match.index + count;
        }
        processLexeme(value.substr(index));
        for(current = top; current.parent; current = current.parent) { // close dangling modes
          if (current.className) {
            result += spanEndTag;
          }
        }
        return {
          relevance: relevance,
          value: result,
          language: name,
          top: top
        };
      } catch (e) {
        if (e.message && e.message.indexOf('Illegal') !== -1) {
          return {
            relevance: 0,
            value: escape(value)
          };
        } else {
          throw e;
        }
      }
    }
  
    /*
    Highlighting with language detection. Accepts a string with the code to
    highlight. Returns an object with the following properties:
  
    - language (detected language)
    - relevance (int)
    - value (an HTML string with highlighting markup)
    - second_best (object with the same structure for second-best heuristically
      detected language, may be absent)
  
    */
    function highlightAuto(text, languageSubset) {
      languageSubset = languageSubset || options.languages || objectKeys(languages);
      var result = {
        relevance: 0,
        value: escape(text)
      };
      var second_best = result;
      languageSubset.filter(getLanguage).filter(autoDetection).forEach(function(name) {
        var current = highlight(name, text, false);
        current.language = name;
        if (current.relevance > second_best.relevance) {
          second_best = current;
        }
        if (current.relevance > result.relevance) {
          second_best = result;
          result = current;
        }
      });
      if (second_best.language) {
        result.second_best = second_best;
      }
      return result;
    }
  
    /*
    Post-processing of the highlighted markup:
  
    - replace TABs with something more useful
    - replace real line-breaks with '<br>' for non-pre containers
  
    */
    function fixMarkup(value) {
      return !(options.tabReplace || options.useBR)
        ? value
        : value.replace(fixMarkupRe, function(match, p1) {
            if (options.useBR && match === '\n') {
              return '<br>';
            } else if (options.tabReplace) {
              return p1.replace(/\t/g, options.tabReplace);
            }
            return '';
        });
    }
  
    function buildClassName(prevClassName, currentLang, resultLang) {
      var language = currentLang ? aliases[currentLang] : resultLang,
          result   = [prevClassName.trim()];
  
      if (!prevClassName.match(/\bhljs\b/)) {
        result.push('hljs');
      }
  
      if (prevClassName.indexOf(language) === -1) {
        result.push(language);
      }
  
      return result.join(' ').trim();
    }
  
    /*
    Applies highlighting to a DOM node containing code. Accepts a DOM node and
    two optional parameters for fixMarkup.
    */
    function highlightBlock(block) {
      var node, originalStream, result, resultNode, text;
      var language = blockLanguage(block);
  
      if (isNotHighlighted(language))
          return;
  
      if (options.useBR) {
        node = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
        node.innerHTML = block.innerHTML.replace(/\n/g, '').replace(/<br[ \/]*>/g, '\n');
      } else {
        node = block;
      }
      text = node.textContent;
      result = language ? highlight(language, text, true) : highlightAuto(text);
  
      originalStream = nodeStream(node);
      if (originalStream.length) {
        resultNode = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
        resultNode.innerHTML = result.value;
        result.value = mergeStreams(originalStream, nodeStream(resultNode), text);
      }
      result.value = fixMarkup(result.value);
  
      block.innerHTML = result.value;
      block.className = buildClassName(block.className, language, result.language);
      block.result = {
        language: result.language,
        re: result.relevance
      };
      if (result.second_best) {
        block.second_best = {
          language: result.second_best.language,
          re: result.second_best.relevance
        };
      }
    }
  
    /*
    Updates highlight.js global options with values passed in the form of an object.
    */
    function configure(user_options) {
      options = inherit(options, user_options);
    }
  
    /*
    Applies highlighting to all <pre><code>..</code></pre> blocks on a page.
    */
    function initHighlighting() {
      if (initHighlighting.called)
        return;
      initHighlighting.called = true;
  
      var blocks = document.querySelectorAll('pre code');
      ArrayProto.forEach.call(blocks, highlightBlock);
    }
  
    /*
    Attaches highlighting to the page load event.
    */
    function initHighlightingOnLoad() {
      addEventListener('DOMContentLoaded', initHighlighting, false);
      addEventListener('load', initHighlighting, false);
    }
  
    function registerLanguage(name, language) {
      var lang = languages[name] = language(hljs);
      if (lang.aliases) {
        lang.aliases.forEach(function(alias) {aliases[alias] = name;});
      }
    }
  
    function listLanguages() {
      return objectKeys(languages);
    }
  
    function getLanguage(name) {
      name = (name || '').toLowerCase();
      return languages[name] || languages[aliases[name]];
    }
  
    function autoDetection(name) {
      var lang = getLanguage(name);
      return lang && !lang.disableAutodetect;
    }
    /* Interface definition */
  
    hljs.highlight = highlight;
    hljs.highlightAuto = highlightAuto;
    hljs.fixMarkup = fixMarkup;
    hljs.highlightBlock = highlightBlock;
    hljs.configure = configure;
    hljs.initHighlighting = initHighlighting;
    hljs.initHighlightingOnLoad = initHighlightingOnLoad;
    hljs.registerLanguage = registerLanguage;
    hljs.listLanguages = listLanguages;
    hljs.getLanguage = getLanguage;
    hljs.autoDetection = autoDetection;
    hljs.inherit = inherit;
    // Common regexps
    hljs.IDENT_RE = '[a-zA-Z]\\w*';
    hljs.UNDERSCORE_IDENT_RE = '[a-zA-Z_]\\w*';
    hljs.NUMBER_RE = '\\b\\d+(\\.\\d+)?';
    hljs.C_NUMBER_RE = '(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)'; // 0x..., 0..., decimal, float
    hljs.BINARY_NUMBER_RE = '\\b(0b[01]+)'; // 0b...
    hljs.RE_STARTERS_RE = '!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~';
  
    // Common modes
    hljs.BACKSLASH_ESCAPE = {
      begin: '\\\\[\\s\\S]', relevance: 0
    };
    hljs.APOS_STRING_MODE = {
      className: 'string',
      begin: '\'', end: '\'',
      illegal: '\\n',
      contains: [hljs.BACKSLASH_ESCAPE]
    };
    hljs.QUOTE_STRING_MODE = {
      className: 'string',
      begin: '"', end: '"',
      illegal: '\\n',
      contains: [hljs.BACKSLASH_ESCAPE]
    };
    hljs.PHRASAL_WORDS_MODE = {
      begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
    };
    hljs.COMMENT = function (begin, end, inherits) {
      var mode = hljs.inherit(
        {
          className: 'comment',
          begin: begin, end: end,
          contains: []
        },
        inherits || {}
      );
      mode.contains.push(hljs.PHRASAL_WORDS_MODE);
      mode.contains.push({
        className: 'doctag',
        begin: '(?:TODO|FIXME|NOTE|BUG|XXX):',
        relevance: 0
      });
      return mode;
    };
    hljs.C_LINE_COMMENT_MODE = hljs.COMMENT('//', '$');
    hljs.C_BLOCK_COMMENT_MODE = hljs.COMMENT('/\\*', '\\*/');
    hljs.HASH_COMMENT_MODE = hljs.COMMENT('#', '$');
    hljs.NUMBER_MODE = {
      className: 'number',
      begin: hljs.NUMBER_RE,
      relevance: 0
    };
    hljs.C_NUMBER_MODE = {
      className: 'number',
      begin: hljs.C_NUMBER_RE,
      relevance: 0
    };
    hljs.BINARY_NUMBER_MODE = {
      className: 'number',
      begin: hljs.BINARY_NUMBER_RE,
      relevance: 0
    };
    hljs.CSS_NUMBER_MODE = {
      className: 'number',
      begin: hljs.NUMBER_RE + '(' +
        '%|em|ex|ch|rem'  +
        '|vw|vh|vmin|vmax' +
        '|cm|mm|in|pt|pc|px' +
        '|deg|grad|rad|turn' +
        '|s|ms' +
        '|Hz|kHz' +
        '|dpi|dpcm|dppx' +
        ')?',
      relevance: 0
    };
    hljs.REGEXP_MODE = {
      className: 'regexp',
      begin: /\//, end: /\/[gimuy]*/,
      illegal: /\n/,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        {
          begin: /\[/, end: /\]/,
          relevance: 0,
          contains: [hljs.BACKSLASH_ESCAPE]
        }
      ]
    };
    hljs.TITLE_MODE = {
      className: 'title',
      begin: hljs.IDENT_RE,
      relevance: 0
    };
    hljs.UNDERSCORE_TITLE_MODE = {
      className: 'title',
      begin: hljs.UNDERSCORE_IDENT_RE,
      relevance: 0
    };
    hljs.METHOD_GUARD = {
      // excludes method names from keyword processing
      begin: '\\.\\s*' + hljs.UNDERSCORE_IDENT_RE,
      relevance: 0
    };
    //注册SQL
    hljs.registerLanguage("sql", function (hljs) {
      var COMMENT_MODE = hljs.COMMENT('--', '$');
      return {
        case_insensitive: true,
        illegal: /[<>{}*]/,
        contains: [
          {
            beginKeywords:
              'begin end start commit rollback savepoint lock alter create drop rename call ' +
              'delete do handler insert load replace select truncate update set show pragma grant ' +
              'merge describe use explain help declare prepare execute deallocate release ' +
              'unlock purge reset change stop analyze cache flush optimize repair kill ' +
              'install uninstall checksum restore check backup revoke comment values with',
            end: /;/, endsWithParent: true,
            lexemes: /[\w\.]+/,
            keywords: {
              keyword:
                'as abort abs absolute acc acce accep accept access accessed accessible account acos action activate add ' +
                'addtime admin administer advanced advise aes_decrypt aes_encrypt after agent aggregate ali alia alias ' +
                'all allocate allow alter always analyze ancillary and anti any anydata anydataset anyschema anytype apply ' +
                'archive archived archivelog are as asc ascii asin assembly assertion associate asynchronous at atan ' +
                'atn2 attr attri attrib attribu attribut attribute attributes audit authenticated authentication authid ' +
                'authors auto autoallocate autodblink autoextend automatic availability avg backup badfile basicfile ' +
                'before begin beginning benchmark between bfile bfile_base big bigfile bin binary_double binary_float ' +
                'binlog bit_and bit_count bit_length bit_or bit_xor bitmap blob_base block blocksize body both bound ' +
                'bucket buffer_cache buffer_pool build bulk by byte byteordermark bytes cache caching call calling cancel ' +
                'capacity cascade cascaded case cast catalog category ceil ceiling chain change changed char_base ' +
                'char_length character_length characters characterset charindex charset charsetform charsetid check ' +
                'checksum checksum_agg child choose chr chunk class cleanup clear client clob clob_base clone close ' +
                'cluster_id cluster_probability cluster_set clustering coalesce coercibility col collate collation ' +
                'collect colu colum column column_value columns columns_updated comment commit compact compatibility ' +
                'compiled complete composite_limit compound compress compute concat concat_ws concurrent confirm conn ' +
                'connec connect connect_by_iscycle connect_by_isleaf connect_by_root connect_time connection ' +
                'consider consistent constant constraint constraints constructor container content contents context ' +
                'contributors controlfile conv convert convert_tz corr corr_k corr_s corresponding corruption cos cost ' +
                'count count_big counted covar_pop covar_samp cpu_per_call cpu_per_session crc32 create creation ' +
                'critical cross cube cume_dist curdate current current_date current_time current_timestamp current_user ' +
                'cursor curtime customdatum cycle data database databases datafile datafiles datalength date_add ' +
                'date_cache date_format date_sub dateadd datediff datefromparts datename datepart datetime2fromparts ' +
                'day day_to_second dayname dayofmonth dayofweek dayofyear days db_role_change dbtimezone ddl deallocate ' +
                'declare decode decompose decrement decrypt deduplicate def defa defau defaul default defaults ' +
                'deferred defi defin define degrees delayed delegate delete delete_all delimited demand dense_rank ' +
                'depth dequeue des_decrypt des_encrypt des_key_file desc descr descri describ describe descriptor ' +
                'deterministic diagnostics difference dimension direct_load directory disable disable_all ' +
                'disallow disassociate discardfile disconnect diskgroup distinct distinctrow distribute distributed div ' +
                'do document domain dotnet double downgrade drop dumpfile duplicate duration each edition editionable ' +
                'editions element ellipsis else elsif elt empty enable enable_all enclosed encode encoding encrypt ' +
                'end end-exec endian enforced engine engines enqueue enterprise entityescaping eomonth error errors ' +
                'escaped evalname evaluate event eventdata events except exception exceptions exchange exclude excluding ' +
                'execu execut execute exempt exists exit exp expire explain explode export export_set extended extent external ' +
                'external_1 external_2 externally extract failed failed_login_attempts failover failure far fast ' +
                'feature_set feature_value fetch field fields file file_name_convert filesystem_like_logging final ' +
                'finish first first_value fixed flash_cache flashback floor flush following follows for forall force foreign ' +
                'form forma format found found_rows freelist freelists freepools fresh from from_base64 from_days ' +
                'ftp full function general generated get get_format get_lock getdate getutcdate global global_name ' +
                'globally go goto grant grants greatest group group_concat group_id grouping grouping_id groups ' +
                'gtid_subtract guarantee guard handler hash hashkeys having hea head headi headin heading heap help hex ' +
                'hierarchy high high_priority hosts hour hours http id ident_current ident_incr ident_seed identified ' +
                'identity idle_time if ifnull ignore iif ilike ilm immediate import in include including increment ' +
                'index indexes indexing indextype indicator indices inet6_aton inet6_ntoa inet_aton inet_ntoa infile ' +
                'initial initialized initially initrans inmemory inner innodb input insert install instance instantiable ' +
                'instr interface interleaved intersect into invalidate invisible is is_free_lock is_ipv4 is_ipv4_compat ' +
                'is_not is_not_null is_used_lock isdate isnull isolation iterate java join json json_exists ' +
                'keep keep_duplicates key keys kill language large last last_day last_insert_id last_value lateral lax lcase ' +
                'lead leading least leaves left len lenght length less level levels library like like2 like4 likec limit ' +
                'lines link list listagg little ln load load_file lob lobs local localtime localtimestamp locate ' +
                'locator lock locked log log10 log2 logfile logfiles logging logical logical_reads_per_call ' +
                'logoff logon logs long loop low low_priority lower lpad lrtrim ltrim main make_set makedate maketime ' +
                'managed management manual map mapping mask master master_pos_wait match matched materialized max ' +
                'maxextents maximize maxinstances maxlen maxlogfiles maxloghistory maxlogmembers maxsize maxtrans ' +
                'md5 measures median medium member memcompress memory merge microsecond mid migration min minextents ' +
                'minimum mining minus minute minutes minvalue missing mod mode model modification modify module monitoring month ' +
                'months mount move movement multiset mutex name name_const names nan national native natural nav nchar ' +
                'nclob nested never new newline next nextval no no_write_to_binlog noarchivelog noaudit nobadfile ' +
                'nocheck nocompress nocopy nocycle nodelay nodiscardfile noentityescaping noguarantee nokeep nologfile ' +
                'nomapping nomaxvalue nominimize nominvalue nomonitoring none noneditionable nonschema noorder ' +
                'nopr nopro noprom nopromp noprompt norely noresetlogs noreverse normal norowdependencies noschemacheck ' +
                'noswitch not nothing notice notnull notrim novalidate now nowait nth_value nullif nulls num numb numbe ' +
                'nvarchar nvarchar2 object ocicoll ocidate ocidatetime ociduration ociinterval ociloblocator ocinumber ' +
                'ociref ocirefcursor ocirowid ocistring ocitype oct octet_length of off offline offset oid oidindex old ' +
                'on online only opaque open operations operator optimal optimize option optionally or oracle oracle_date ' +
                'oradata ord ordaudio orddicom orddoc order ordimage ordinality ordvideo organization orlany orlvary ' +
                'out outer outfile outline output over overflow overriding package pad parallel parallel_enable ' +
                'parameters parent parse partial partition partitions pascal passing password password_grace_time ' +
                'password_lock_time password_reuse_max password_reuse_time password_verify_function patch path patindex ' +
                'pctincrease pctthreshold pctused pctversion percent percent_rank percentile_cont percentile_disc ' +
                'performance period period_add period_diff permanent physical pi pipe pipelined pivot pluggable plugin ' +
                'policy position post_transaction pow power pragma prebuilt precedes preceding precision prediction ' +
                'prediction_cost prediction_details prediction_probability prediction_set prepare present preserve ' +
                'prior priority private private_sga privileges procedural procedure procedure_analyze processlist ' +
                'profiles project prompt protection public publishingservername purge quarter query quick quiesce quota ' +
                'quotename radians raise rand range rank raw read reads readsize rebuild record records ' +
                'recover recovery recursive recycle redo reduced ref reference referenced references referencing refresh ' +
                'regexp_like register regr_avgx regr_avgy regr_count regr_intercept regr_r2 regr_slope regr_sxx regr_sxy ' +
                'reject rekey relational relative relaylog release release_lock relies_on relocate rely rem remainder rename ' +
                'repair repeat replace replicate replication required reset resetlogs resize resource respect restore ' +
                'restricted result result_cache resumable resume retention return returning returns reuse reverse revoke ' +
                'right rlike role roles rollback rolling rollup round row row_count rowdependencies rowid rownum rows ' +
                'rtrim rules safe salt sample save savepoint sb1 sb2 sb4 scan schema schemacheck scn scope scroll ' +
                'sdo_georaster sdo_topo_geometry search sec_to_time second seconds section securefile security seed segment select ' +
                'self semi sequence sequential serializable server servererror session session_user sessions_per_user set ' +
                'sets settings sha sha1 sha2 share shared shared_pool short show shrink shutdown si_averagecolor ' +
                'si_colorhistogram si_featurelist si_positionalcolor si_stillimage si_texture siblings sid sign sin ' +
                'size size_t sizes skip slave sleep smalldatetimefromparts smallfile snapshot some soname sort soundex ' +
                'source space sparse spfile split sql sql_big_result sql_buffer_result sql_cache sql_calc_found_rows ' +
                'sql_small_result sql_variant_property sqlcode sqldata sqlerror sqlname sqlstate sqrt square standalone ' +
                'standby start starting startup statement static statistics stats_binomial_test stats_crosstab ' +
                'stats_ks_test stats_mode stats_mw_test stats_one_way_anova stats_t_test_ stats_t_test_indep ' +
                'stats_t_test_one stats_t_test_paired stats_wsr_test status std stddev stddev_pop stddev_samp stdev ' +
                'stop storage store stored str str_to_date straight_join strcmp strict string struct stuff style subdate ' +
                'subpartition subpartitions substitutable substr substring subtime subtring_index subtype success sum ' +
                'suspend switch switchoffset switchover sync synchronous synonym sys sys_xmlagg sysasm sysaux sysdate ' +
                'sysdatetimeoffset sysdba sysoper system system_user sysutcdatetime table tables tablespace tablesample tan tdo ' +
                'template temporary terminated tertiary_weights test than then thread through tier ties time time_format ' +
                'time_zone timediff timefromparts timeout timestamp timestampadd timestampdiff timezone_abbr ' +
                'timezone_minute timezone_region to to_base64 to_date to_days to_seconds todatetimeoffset trace tracking ' +
                'transaction transactional translate translation treat trigger trigger_nestlevel triggers trim truncate ' +
                'try_cast try_convert try_parse type ub1 ub2 ub4 ucase unarchived unbounded uncompress ' +
                'under undo unhex unicode uniform uninstall union unique unix_timestamp unknown unlimited unlock unnest unpivot ' +
                'unrecoverable unsafe unsigned until untrusted unusable unused update updated upgrade upped upper upsert ' +
                'url urowid usable usage use use_stored_outlines user user_data user_resources users using utc_date ' +
                'utc_timestamp uuid uuid_short validate validate_password_strength validation valist value values var ' +
                'var_samp varcharc vari varia variab variabl variable variables variance varp varraw varrawc varray ' +
                'verify version versions view virtual visible void wait wallet warning warnings week weekday weekofyear ' +
                'wellformed when whene whenev wheneve whenever where while whitespace window with within without work wrapped ' +
                'xdb xml xmlagg xmlattributes xmlcast xmlcolattval xmlelement xmlexists xmlforest xmlindex xmlnamespaces ' +
                'xmlpi xmlquery xmlroot xmlschema xmlserialize xmltable xmltype xor year year_to_month years yearweek',
              literal:
                'true false null unknown',
              built_in:
                'array bigint binary bit blob bool boolean char character date dec decimal float int int8 integer interval number ' +
                'numeric real record serial serial8 smallint text time timestamp tinyint varchar varying void'
            },
            contains: [
              {
                className: 'string',
                begin: '\'', end: '\'',
                contains: [hljs.BACKSLASH_ESCAPE, {begin: '\'\''}]
              },
              {
                className: 'string',
                begin: '"', end: '"',
                contains: [hljs.BACKSLASH_ESCAPE, {begin: '""'}]
              },
              {
                className: 'string',
                begin: '`', end: '`',
                contains: [hljs.BACKSLASH_ESCAPE]
              },
              hljs.C_NUMBER_MODE,
              hljs.C_BLOCK_COMMENT_MODE,
              COMMENT_MODE,
              hljs.HASH_COMMENT_MODE
            ]
          },
          hljs.C_BLOCK_COMMENT_MODE,
          COMMENT_MODE,
          hljs.HASH_COMMENT_MODE
        ]
      };
    });
    //注册JavaScript
    hljs.registerLanguage("javascript",function(hljs){
      var IDENT_RE = '[A-Za-z$_][0-9A-Za-z$_]*';
      var KEYWORDS = {
        keyword:
          'in of if for while finally var new function do return void else break catch ' +
          'instanceof with throw case default try this switch continue typeof delete ' +
          'let yield const export super debugger as async await static ' +
          // ECMAScript 6 modules import
          'import from as'
        ,
        literal:
          'true false null undefined NaN Infinity',
        built_in:
          'eval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent ' +
          'encodeURI encodeURIComponent escape unescape Object Function Boolean Error ' +
          'EvalError InternalError RangeError ReferenceError StopIteration SyntaxError ' +
          'TypeError URIError Number Math Date String RegExp Array Float32Array ' +
          'Float64Array Int16Array Int32Array Int8Array Uint16Array Uint32Array ' +
          'Uint8Array Uint8ClampedArray ArrayBuffer DataView JSON Intl arguments require ' +
          'module console window document Symbol Set Map WeakSet WeakMap Proxy Reflect ' +
          'Promise'
      };
      var NUMBER = {
        className: 'number',
        variants: [
          { begin: '\\b(0[bB][01]+)' },
          { begin: '\\b(0[oO][0-7]+)' },
          { begin: hljs.C_NUMBER_RE }
        ],
        relevance: 0
      };
      var SUBST = {
        className: 'subst',
        begin: '\\$\\{', end: '\\}',
        keywords: KEYWORDS,
        contains: []  // defined later
      };
      var TEMPLATE_STRING = {
        className: 'string',
        begin: '`', end: '`',
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ]
      };
      SUBST.contains = [
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        TEMPLATE_STRING,
        NUMBER,
        hljs.REGEXP_MODE
      ]
      var PARAMS_CONTAINS = SUBST.contains.concat([
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.C_LINE_COMMENT_MODE
      ]);
    
      return {
        aliases: ['js', 'jsx'],
        keywords: KEYWORDS,
        contains: [
          {
            className: 'meta',
            relevance: 10,
            begin: /^\s*['"]use (strict|asm)['"]/
          },
          {
            className: 'meta',
            begin: /^#!/, end: /$/
          },
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE,
          TEMPLATE_STRING,
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          NUMBER,
          { // object attr container
            begin: /[{,]\s*/, relevance: 0,
            contains: [
              {
                begin: IDENT_RE + '\\s*:', returnBegin: true,
                relevance: 0,
                contains: [{className: 'attr', begin: IDENT_RE, relevance: 0}]
              }
            ]
          },
          { // "value" container
            begin: '(' + hljs.RE_STARTERS_RE + '|\\b(case|return|throw)\\b)\\s*',
            keywords: 'return throw case',
            contains: [
              hljs.C_LINE_COMMENT_MODE,
              hljs.C_BLOCK_COMMENT_MODE,
              hljs.REGEXP_MODE,
              {
                className: 'function',
                begin: '(\\(.*?\\)|' + IDENT_RE + ')\\s*=>', returnBegin: true,
                end: '\\s*=>',
                contains: [
                  {
                    className: 'params',
                    variants: [
                      {
                        begin: IDENT_RE
                      },
                      {
                        begin: /\(\s*\)/,
                      },
                      {
                        begin: /\(/, end: /\)/,
                        excludeBegin: true, excludeEnd: true,
                        keywords: KEYWORDS,
                        contains: PARAMS_CONTAINS
                      }
                    ]
                  }
                ]
              },
              { // E4X / JSX
                begin: /</, end: /(\/\w+|\w+\/)>/,
                subLanguage: 'xml',
                contains: [
                  {begin: /<\w+\s*\/>/, skip: true},
                  {
                    begin: /<\w+/, end: /(\/\w+|\w+\/)>/, skip: true,
                    contains: [
                      {begin: /<\w+\s*\/>/, skip: true},
                      'self'
                    ]
                  }
                ]
              }
            ],
            relevance: 0
          },
          {
            className: 'function',
            beginKeywords: 'function', end: /\{/, excludeEnd: true,
            contains: [
              hljs.inherit(hljs.TITLE_MODE, {begin: IDENT_RE}),
              {
                className: 'params',
                begin: /\(/, end: /\)/,
                excludeBegin: true,
                excludeEnd: true,
                contains: PARAMS_CONTAINS
              }
            ],
            illegal: /\[|%/
          },
          {
            begin: /\$[(.]/ // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
          },
          hljs.METHOD_GUARD,
          { // ES6 class
            className: 'class',
            beginKeywords: 'class', end: /[{;=]/, excludeEnd: true,
            illegal: /[:"\[\]]/,
            contains: [
              {beginKeywords: 'extends'},
              hljs.UNDERSCORE_TITLE_MODE
            ]
          },
          {
            beginKeywords: 'constructor', end: /\{/, excludeEnd: true
          }
        ],
        illegal: /#(?!!)/
      };
    });
    //注册XML,HTML
    hljs.registerLanguage("xml",function(hljs){
      var XML_IDENT_RE = '[A-Za-z0-9\\._:-]+';
      var TAG_INTERNALS = {
        endsWithParent: true,
        illegal: /</,
        relevance: 0,
        contains: [
          {
            className: 'attr',
            begin: XML_IDENT_RE,
            relevance: 0
          },
          {
            begin: /=\s*/,
            relevance: 0,
            contains: [
              {
                className: 'string',
                endsParent: true,
                variants: [
                  {begin: /"/, end: /"/},
                  {begin: /'/, end: /'/},
                  {begin: /[^\s"'=<>`]+/}
                ]
              }
            ]
          }
        ]
      };
      return {
        aliases: ['html', 'xhtml', 'rss', 'atom', 'xjb', 'xsd', 'xsl', 'plist'],
        case_insensitive: true,
        contains: [
          {
            className: 'meta',
            begin: '<!DOCTYPE', end: '>',
            relevance: 10,
            contains: [{begin: '\\[', end: '\\]'}]
          },
          hljs.COMMENT(
            '<!--',
            '-->',
            {
              relevance: 10
            }
          ),
          {
            begin: '<\\!\\[CDATA\\[', end: '\\]\\]>',
            relevance: 10
          },
          {
            className: 'meta',
            begin: /<\?xml/, end: /\?>/, relevance: 10
          },
          {
            begin: /<\?(php)?/, end: /\?>/,
            subLanguage: 'php',
            contains: [
              // We don't want the php closing tag ?> to close the PHP block when
              // inside any of the following blocks:
              {begin: '/\\*', end: '\\*/', skip: true},
              {begin: 'b"', end: '"', skip: true},
              {begin: 'b\'', end: '\'', skip: true},
              hljs.inherit(hljs.APOS_STRING_MODE, {illegal: null, className: null, contains: null, skip: true}),
              hljs.inherit(hljs.QUOTE_STRING_MODE, {illegal: null, className: null, contains: null, skip: true})
            ]
          },
          {
            className: 'tag',
            /*
            The lookahead pattern (?=...) ensures that 'begin' only matches
            '<style' as a single word, followed by a whitespace or an
            ending braket. The '$' is needed for the lexeme to be recognized
            by hljs.subMode() that tests lexemes outside the stream.
            */
            begin: '<style(?=\\s|>|$)', end: '>',
            keywords: {name: 'style'},
            contains: [TAG_INTERNALS],
            starts: {
              end: '</style>', returnEnd: true,
              subLanguage: ['css', 'xml']
            }
          },
          {
            className: 'tag',
            // See the comment in the <style tag about the lookahead pattern
            begin: '<script(?=\\s|>|$)', end: '>',
            keywords: {name: 'script'},
            contains: [TAG_INTERNALS],
            starts: {
              end: '\<\/script\>', returnEnd: true,
              subLanguage: ['actionscript', 'javascript', 'handlebars', 'xml']
            }
          },
          {
            className: 'tag',
            begin: '</?', end: '/?>',
            contains: [
              {
                className: 'name', begin: /[^\/><\s]+/, relevance: 0
              },
              TAG_INTERNALS
            ]
          }
        ]
      };
    });
    //注册C#
    hljs.registerLanguage("cs",function(hljs){
      var KEYWORDS = {
        keyword:
          // Normal keywords.
          'abstract as base bool break byte case catch char checked const continue decimal ' +
          'default delegate do double enum event explicit extern finally fixed float ' +
          'for foreach goto if implicit in int interface internal is lock long nameof ' +
          'object operator out override params private protected public readonly ref sbyte ' +
          'sealed short sizeof stackalloc static string struct switch this try typeof ' +
          'uint ulong unchecked unsafe ushort using virtual void volatile while ' +
          // Contextual keywords.
          'add alias ascending async await by descending dynamic equals from get global group into join ' +
          'let on orderby partial remove select set value var where yield',
        literal:
          'null false true'
      };
      var NUMBERS = {
        className: 'number',
        variants: [
          { begin: '\\b(0b[01\']+)' },
          { begin: '(-?)\\b([\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)(u|U|l|L|ul|UL|f|F|b|B)' },
          { begin: '(-?)(\\b0[xX][a-fA-F0-9\']+|(\\b[\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)([eE][-+]?[\\d\']+)?)' }
        ],
        relevance: 0
      };
      var VERBATIM_STRING = {
        className: 'string',
        begin: '@"', end: '"',
        contains: [{begin: '""'}]
      };
      var VERBATIM_STRING_NO_LF = hljs.inherit(VERBATIM_STRING, {illegal: /\n/});
      var SUBST = {
        className: 'subst',
        begin: '{', end: '}',
        keywords: KEYWORDS
      };
      var SUBST_NO_LF = hljs.inherit(SUBST, {illegal: /\n/});
      var INTERPOLATED_STRING = {
        className: 'string',
        begin: /\$"/, end: '"',
        illegal: /\n/,
        contains: [{begin: '{{'}, {begin: '}}'}, hljs.BACKSLASH_ESCAPE, SUBST_NO_LF]
      };
      var INTERPOLATED_VERBATIM_STRING = {
        className: 'string',
        begin: /\$@"/, end: '"',
        contains: [{begin: '{{'}, {begin: '}}'}, {begin: '""'}, SUBST]
      };
      var INTERPOLATED_VERBATIM_STRING_NO_LF = hljs.inherit(INTERPOLATED_VERBATIM_STRING, {
        illegal: /\n/,
        contains: [{begin: '{{'}, {begin: '}}'}, {begin: '""'}, SUBST_NO_LF]
      });
      SUBST.contains = [
        INTERPOLATED_VERBATIM_STRING,
        INTERPOLATED_STRING,
        VERBATIM_STRING,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        NUMBERS,
        hljs.C_BLOCK_COMMENT_MODE
      ];
      SUBST_NO_LF.contains = [
        INTERPOLATED_VERBATIM_STRING_NO_LF,
        INTERPOLATED_STRING,
        VERBATIM_STRING_NO_LF,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        NUMBERS,
        hljs.inherit(hljs.C_BLOCK_COMMENT_MODE, {illegal: /\n/})
      ];
      var STRING = {
        variants: [
          INTERPOLATED_VERBATIM_STRING,
          INTERPOLATED_STRING,
          VERBATIM_STRING,
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE
        ]
      };
    
      var TYPE_IDENT_RE = hljs.IDENT_RE + '(<' + hljs.IDENT_RE + '(\\s*,\\s*' + hljs.IDENT_RE + ')*>)?(\\[\\])?';
    
      return {
        aliases: ['csharp', 'c#'],
        keywords: KEYWORDS,
        illegal: /::/,
        contains: [
          hljs.COMMENT(
            '///',
            '$',
            {
              returnBegin: true,
              contains: [
                {
                  className: 'doctag',
                  variants: [
                    {
                      begin: '///', relevance: 0
                    },
                    {
                      begin: '<!--|-->'
                    },
                    {
                      begin: '</?', end: '>'
                    }
                  ]
                }
              ]
            }
          ),
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          {
            className: 'meta',
            begin: '#', end: '$',
            keywords: {
              'meta-keyword': 'if else elif endif define undef warning error line region endregion pragma checksum'
            }
          },
          STRING,
          NUMBERS,
          {
            beginKeywords: 'class interface', end: /[{;=]/,
            illegal: /[^\s:,]/,
            contains: [
              hljs.TITLE_MODE,
              hljs.C_LINE_COMMENT_MODE,
              hljs.C_BLOCK_COMMENT_MODE
            ]
          },
          {
            beginKeywords: 'namespace', end: /[{;=]/,
            illegal: /[^\s:]/,
            contains: [
              hljs.inherit(hljs.TITLE_MODE, {begin: '[a-zA-Z](\\.?\\w)*'}),
              hljs.C_LINE_COMMENT_MODE,
              hljs.C_BLOCK_COMMENT_MODE
            ]
          },
          {
            // [Attributes("")]
            className: 'meta',
            begin: '^\\s*\\[', excludeBegin: true, end: '\\]', excludeEnd: true,
            contains: [
              {className: 'meta-string', begin: /"/, end: /"/}
            ]
          },
          {
            // Expression keywords prevent 'keyword Name(...)' from being
            // recognized as a function definition
            beginKeywords: 'new return throw await else',
            relevance: 0
          },
          {
            className: 'function',
            begin: '(' + TYPE_IDENT_RE + '\\s+)+' + hljs.IDENT_RE + '\\s*\\(', returnBegin: true,
            end: /\s*[{;=]/, excludeEnd: true,
            keywords: KEYWORDS,
            contains: [
              {
                begin: hljs.IDENT_RE + '\\s*\\(', returnBegin: true,
                contains: [hljs.TITLE_MODE],
                relevance: 0
              },
              {
                className: 'params',
                begin: /\(/, end: /\)/,
                excludeBegin: true,
                excludeEnd: true,
                keywords: KEYWORDS,
                relevance: 0,
                contains: [
                  STRING,
                  NUMBERS,
                  hljs.C_BLOCK_COMMENT_MODE
                ]
              },
              hljs.C_LINE_COMMENT_MODE,
              hljs.C_BLOCK_COMMENT_MODE
            ]
          }
        ]
      };
    });
    //注册C++
    hljs.registerLanguage("cpp",function(hljs){
      var CPP_PRIMITIVE_TYPES = {
        className: 'keyword',
        begin: '\\b[a-z\\d_]*_t\\b'
      };
    
      var STRINGS = {
        className: 'string',
        variants: [
          {
            begin: '(u8?|U|L)?"', end: '"',
            illegal: '\\n',
            contains: [hljs.BACKSLASH_ESCAPE]
          },
          {
            // TODO: This does not handle raw string literals with prefixes. Using
            // a single regex with backreferences would work (note to use *?
            // instead of * to make it non-greedy), but the mode.terminators
            // computation in highlight.js breaks the counting.
            begin: '(u8?|U|L)?R"\\(', end: '\\)"',
          },
          {
            begin: '\'\\\\?.', end: '\'',
            illegal: '.'
          }
        ]
      };
    
      var NUMBERS = {
        className: 'number',
        variants: [
          { begin: '\\b(0b[01\']+)' },
          { begin: '(-?)\\b([\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)(u|U|l|L|ul|UL|f|F|b|B)' },
          { begin: '(-?)(\\b0[xX][a-fA-F0-9\']+|(\\b[\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)([eE][-+]?[\\d\']+)?)' }
        ],
        relevance: 0
      };
    
      var PREPROCESSOR =       {
        className: 'meta',
        begin: /#\s*[a-z]+\b/, end: /$/,
        keywords: {
          'meta-keyword':
            'if else elif endif define undef warning error line ' +
            'pragma ifdef ifndef include'
        },
        contains: [
          {
            begin: /\\\n/, relevance: 0
          },
          hljs.inherit(STRINGS, {className: 'meta-string'}),
          {
            className: 'meta-string',
            begin: /<[^\n>]*>/, end: /$/,
            illegal: '\\n',
          },
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE
        ]
      };
    
      var FUNCTION_TITLE = hljs.IDENT_RE + '\\s*\\(';
    
      var CPP_KEYWORDS = {
        keyword: 'int float while private char catch import module export virtual operator sizeof ' +
          'dynamic_cast|10 typedef const_cast|10 const for static_cast|10 union namespace ' +
          'unsigned long volatile static protected bool template mutable if public friend ' +
          'do goto auto void enum else break extern using asm case typeid ' +
          'short reinterpret_cast|10 default double register explicit signed typename try this ' +
          'switch continue inline delete alignof constexpr decltype ' +
          'noexcept static_assert thread_local restrict _Bool complex _Complex _Imaginary ' +
          'atomic_bool atomic_char atomic_schar ' +
          'atomic_uchar atomic_short atomic_ushort atomic_int atomic_uint atomic_long atomic_ulong atomic_llong ' +
          'atomic_ullong new throw return ' +
          'and or not',
        built_in: 'std string cin cout cerr clog stdin stdout stderr stringstream istringstream ostringstream ' +
          'auto_ptr deque list queue stack vector map set bitset multiset multimap unordered_set ' +
          'unordered_map unordered_multiset unordered_multimap array shared_ptr abort abs acos ' +
          'asin atan2 atan calloc ceil cosh cos exit exp fabs floor fmod fprintf fputs free frexp ' +
          'fscanf isalnum isalpha iscntrl isdigit isgraph islower isprint ispunct isspace isupper ' +
          'isxdigit tolower toupper labs ldexp log10 log malloc realloc memchr memcmp memcpy memset modf pow ' +
          'printf putchar puts scanf sinh sin snprintf sprintf sqrt sscanf strcat strchr strcmp ' +
          'strcpy strcspn strlen strncat strncmp strncpy strpbrk strrchr strspn strstr tanh tan ' +
          'vfprintf vprintf vsprintf endl initializer_list unique_ptr',
        literal: 'true false nullptr NULL'
      };
    
      var EXPRESSION_CONTAINS = [
        CPP_PRIMITIVE_TYPES,
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        NUMBERS,
        STRINGS
      ];
    
      return {
        aliases: ['c', 'cc', 'h', 'c++', 'h++', 'hpp'],
        keywords: CPP_KEYWORDS,
        illegal: '</',
        contains: EXPRESSION_CONTAINS.concat([
          PREPROCESSOR,
          {
            begin: '\\b(deque|list|queue|stack|vector|map|set|bitset|multiset|multimap|unordered_map|unordered_set|unordered_multiset|unordered_multimap|array)\\s*<', end: '>',
            keywords: CPP_KEYWORDS,
            contains: ['self', CPP_PRIMITIVE_TYPES]
          },
          {
            begin: hljs.IDENT_RE + '::',
            keywords: CPP_KEYWORDS
          },
          {
            // This mode covers expression context where we can't expect a function
            // definition and shouldn't highlight anything that looks like one:
            // `return some()`, `else if()`, `(x*sum(1, 2))`
            variants: [
              {begin: /=/, end: /;/},
              {begin: /\(/, end: /\)/},
              {beginKeywords: 'new throw return else', end: /;/}
            ],
            keywords: CPP_KEYWORDS,
            contains: EXPRESSION_CONTAINS.concat([
              {
                begin: /\(/, end: /\)/,
                keywords: CPP_KEYWORDS,
                contains: EXPRESSION_CONTAINS.concat(['self']),
                relevance: 0
              }
            ]),
            relevance: 0
          },
          {
            className: 'function',
            begin: '(' + hljs.IDENT_RE + '[\\*&\\s]+)+' + FUNCTION_TITLE,
            returnBegin: true, end: /[{;=]/,
            excludeEnd: true,
            keywords: CPP_KEYWORDS,
            illegal: /[^\w\s\*&]/,
            contains: [
              {
                begin: FUNCTION_TITLE, returnBegin: true,
                contains: [hljs.TITLE_MODE],
                relevance: 0
              },
              {
                className: 'params',
                begin: /\(/, end: /\)/,
                keywords: CPP_KEYWORDS,
                relevance: 0,
                contains: [
                  hljs.C_LINE_COMMENT_MODE,
                  hljs.C_BLOCK_COMMENT_MODE,
                  STRINGS,
                  NUMBERS,
                  CPP_PRIMITIVE_TYPES,
                  // Count matching parentheses.
                  {
                    begin: /\(/, end: /\)/,
                    keywords: CPP_KEYWORDS,
                    relevance: 0,
                    contains: [
                      'self',
                      hljs.C_LINE_COMMENT_MODE,
                      hljs.C_BLOCK_COMMENT_MODE,
                      STRINGS,
                      NUMBERS,
                      CPP_PRIMITIVE_TYPES
                    ]
                  }
                ]
              },
              hljs.C_LINE_COMMENT_MODE,
              hljs.C_BLOCK_COMMENT_MODE,
              PREPROCESSOR
            ]
          },
          {
            className: 'class',
            beginKeywords: 'class struct', end: /[{;:]/,
            contains: [
              {begin: /</, end: />/, contains: ['self']}, // skip generic stuff
              hljs.TITLE_MODE
            ]
          }
        ]),
        exports: {
          preprocessor: PREPROCESSOR,
          strings: STRINGS,
          keywords: CPP_KEYWORDS
        }
      };
    });
    //注册CSS
    hljs.registerLanguage("css",function(hljs){
      var IDENT_RE = '[a-zA-Z-][a-zA-Z0-9_-]*';
      var RULE = {
        begin: /[A-Z\_\.\-]+\s*:/, returnBegin: true, end: ';', endsWithParent: true,
        contains: [
          {
            className: 'attribute',
            begin: /\S/, end: ':', excludeEnd: true,
            starts: {
              endsWithParent: true, excludeEnd: true,
              contains: [
                {
                  begin: /[\w-]+\(/, returnBegin: true,
                  contains: [
                    {
                      className: 'built_in',
                      begin: /[\w-]+/
                    },
                    {
                      begin: /\(/, end: /\)/,
                      contains: [
                        hljs.APOS_STRING_MODE,
                        hljs.QUOTE_STRING_MODE
                      ]
                    }
                  ]
                },
                hljs.CSS_NUMBER_MODE,
                hljs.QUOTE_STRING_MODE,
                hljs.APOS_STRING_MODE,
                hljs.C_BLOCK_COMMENT_MODE,
                {
                  className: 'number', begin: '#[0-9A-Fa-f]+'
                },
                {
                  className: 'meta', begin: '!important'
                }
              ]
            }
          }
        ]
      };
    
      return {
        case_insensitive: true,
        illegal: /[=\/|'\$]/,
        contains: [
          hljs.C_BLOCK_COMMENT_MODE,
          {
            className: 'selector-id', begin: /#[A-Za-z0-9_-]+/
          },
          {
            className: 'selector-class', begin: /\.[A-Za-z0-9_-]+/
          },
          {
            className: 'selector-attr',
            begin: /\[/, end: /\]/,
            illegal: '$'
          },
          {
            className: 'selector-pseudo',
            begin: /:(:)?[a-zA-Z0-9\_\-\+\(\)"'.]+/
          },
          {
            begin: '@(font-face|page)',
            lexemes: '[a-z-]+',
            keywords: 'font-face page'
          },
          {
            begin: '@', end: '[{;]', // at_rule eating first "{" is a good thing
                                     // because it doesn’t let it to be parsed as
                                     // a rule set but instead drops parser into
                                     // the default mode which is how it should be.
            illegal: /:/, // break on Less variables @var: ...
            contains: [
              {
                className: 'keyword',
                begin: /\w+/
              },
              {
                begin: /\s/, endsWithParent: true, excludeEnd: true,
                relevance: 0,
                contains: [
                  hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE,
                  hljs.CSS_NUMBER_MODE
                ]
              }
            ]
          },
          {
            className: 'selector-tag', begin: IDENT_RE,
            relevance: 0
          },
          {
            begin: '{', end: '}',
            illegal: /\S/,
            contains: [
              hljs.C_BLOCK_COMMENT_MODE,
              RULE,
            ]
          }
        ]
      };
    });
    //注册JSON
    hljs.registerLanguage("json",function(hljs){
      var LITERALS = {literal: 'true false null'};
      var TYPES = [
        hljs.QUOTE_STRING_MODE,
        hljs.C_NUMBER_MODE
      ];
      var VALUE_CONTAINER = {
        end: ',', endsWithParent: true, excludeEnd: true,
        contains: TYPES,
        keywords: LITERALS
      };
      var OBJECT = {
        begin: '{', end: '}',
        contains: [
          {
            className: 'attr',
            begin: /"/, end: /"/,
            contains: [hljs.BACKSLASH_ESCAPE],
            illegal: '\\n',
          },
          hljs.inherit(VALUE_CONTAINER, {begin: /:/})
        ],
        illegal: '\\S'
      };
      var ARRAY = {
        begin: '\\[', end: '\\]',
        contains: [hljs.inherit(VALUE_CONTAINER)], // inherit is a workaround for a bug that makes shared modes with endsWithParent compile only the ending of one of the parents
        illegal: '\\S'
      };
      TYPES.splice(TYPES.length, 0, OBJECT, ARRAY);
      return {
        contains: TYPES,
        keywords: LITERALS,
        illegal: '\\S'
      };
    });
    //注册Java
    hljs.registerLanguage("java",function(hljs){
      var JAVA_IDENT_RE = '[\u00C0-\u02B8a-zA-Z_$][\u00C0-\u02B8a-zA-Z_$0-9]*';
      var GENERIC_IDENT_RE = JAVA_IDENT_RE + '(<' + JAVA_IDENT_RE + '(\\s*,\\s*' + JAVA_IDENT_RE + ')*>)?';
      var KEYWORDS =
        'false synchronized int abstract float private char boolean var static null if const ' +
        'for true while long strictfp finally protected import native final void ' +
        'enum else break transient catch instanceof byte super volatile case assert short ' +
        'package default double public try this switch continue throws protected public private ' +
        'module requires exports do';
    
      // https://docs.oracle.com/javase/7/docs/technotes/guides/language/underscores-literals.html
      var JAVA_NUMBER_RE = '\\b' +
        '(' +
          '0[bB]([01]+[01_]+[01]+|[01]+)' + // 0b...
          '|' +
          '0[xX]([a-fA-F0-9]+[a-fA-F0-9_]+[a-fA-F0-9]+|[a-fA-F0-9]+)' + // 0x...
          '|' +
          '(' +
            '([\\d]+[\\d_]+[\\d]+|[\\d]+)(\\.([\\d]+[\\d_]+[\\d]+|[\\d]+))?' +
            '|' +
            '\\.([\\d]+[\\d_]+[\\d]+|[\\d]+)' +
          ')' +
          '([eE][-+]?\\d+)?' + // octal, decimal, float
        ')' +
        '[lLfF]?';
      var JAVA_NUMBER_MODE = {
        className: 'number',
        begin: JAVA_NUMBER_RE,
        relevance: 0
      };
    
      return {
        aliases: ['jsp'],
        keywords: KEYWORDS,
        illegal: /<\/|#/,
        contains: [
          hljs.COMMENT(
            '/\\*\\*',
            '\\*/',
            {
              relevance : 0,
              contains : [
                {
                  // eat up @'s in emails to prevent them to be recognized as doctags
                  begin: /\w+@/, relevance: 0
                },
                {
                  className : 'doctag',
                  begin : '@[A-Za-z]+'
                }
              ]
            }
          ),
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE,
          {
            className: 'class',
            beginKeywords: 'class interface', end: /[{;=]/, excludeEnd: true,
            keywords: 'class interface',
            illegal: /[:"\[\]]/,
            contains: [
              {beginKeywords: 'extends implements'},
              hljs.UNDERSCORE_TITLE_MODE
            ]
          },
          {
            // Expression keywords prevent 'keyword Name(...)' from being
            // recognized as a function definition
            beginKeywords: 'new throw return else',
            relevance: 0
          },
          {
            className: 'function',
            begin: '(' + GENERIC_IDENT_RE + '\\s+)+' + hljs.UNDERSCORE_IDENT_RE + '\\s*\\(', returnBegin: true, end: /[{;=]/,
            excludeEnd: true,
            keywords: KEYWORDS,
            contains: [
              {
                begin: hljs.UNDERSCORE_IDENT_RE + '\\s*\\(', returnBegin: true,
                relevance: 0,
                contains: [hljs.UNDERSCORE_TITLE_MODE]
              },
              {
                className: 'params',
                begin: /\(/, end: /\)/,
                keywords: KEYWORDS,
                relevance: 0,
                contains: [
                  hljs.APOS_STRING_MODE,
                  hljs.QUOTE_STRING_MODE,
                  hljs.C_NUMBER_MODE,
                  hljs.C_BLOCK_COMMENT_MODE
                ]
              },
              hljs.C_LINE_COMMENT_MODE,
              hljs.C_BLOCK_COMMENT_MODE
            ]
          },
          JAVA_NUMBER_MODE,
          {
            className: 'meta', begin: '@[A-Za-z]+'
          }
        ]
      };
    });
    //注册PHP
    hljs.registerLanguage("php",function(hljs){
      var VARIABLE = {
        begin: '\\$+[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*'
      };
      var PREPROCESSOR = {
        className: 'meta', begin: /<\?(php)?|\?>/
      };
      var STRING = {
        className: 'string',
        contains: [hljs.BACKSLASH_ESCAPE, PREPROCESSOR],
        variants: [
          {
            begin: 'b"', end: '"'
          },
          {
            begin: 'b\'', end: '\''
          },
          hljs.inherit(hljs.APOS_STRING_MODE, {illegal: null}),
          hljs.inherit(hljs.QUOTE_STRING_MODE, {illegal: null})
        ]
      };
      var NUMBER = {variants: [hljs.BINARY_NUMBER_MODE, hljs.C_NUMBER_MODE]};
      return {
        aliases: ['php', 'php3', 'php4', 'php5', 'php6', 'php7'],
        case_insensitive: true,
        keywords:
          'and include_once list abstract global private echo interface as static endswitch ' +
          'array null if endwhile or const for endforeach self var while isset public ' +
          'protected exit foreach throw elseif include __FILE__ empty require_once do xor ' +
          'return parent clone use __CLASS__ __LINE__ else break print eval new ' +
          'catch __METHOD__ case exception default die require __FUNCTION__ ' +
          'enddeclare final try switch continue endfor endif declare unset true false ' +
          'trait goto instanceof insteadof __DIR__ __NAMESPACE__ ' +
          'yield finally',
        contains: [
          hljs.HASH_COMMENT_MODE,
          hljs.COMMENT('//', '$', {contains: [PREPROCESSOR]}),
          hljs.COMMENT(
            '/\\*',
            '\\*/',
            {
              contains: [
                {
                  className: 'doctag',
                  begin: '@[A-Za-z]+'
                }
              ]
            }
          ),
          hljs.COMMENT(
            '__halt_compiler.+?;',
            false,
            {
              endsWithParent: true,
              keywords: '__halt_compiler',
              lexemes: hljs.UNDERSCORE_IDENT_RE
            }
          ),
          {
            className: 'string',
            begin: /<<<['"]?\w+['"]?$/, end: /^\w+;?$/,
            contains: [
              hljs.BACKSLASH_ESCAPE,
              {
                className: 'subst',
                variants: [
                  {begin: /\$\w+/},
                  {begin: /\{\$/, end: /\}/}
                ]
              }
            ]
          },
          PREPROCESSOR,
          {
            className: 'keyword', begin: /\$this\b/
          },
          VARIABLE,
          {
            // swallow composed identifiers to avoid parsing them as keywords
            begin: /(::|->)+[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*/
          },
          {
            className: 'function',
            beginKeywords: 'function', end: /[;{]/, excludeEnd: true,
            illegal: '\\$|\\[|%',
            contains: [
              hljs.UNDERSCORE_TITLE_MODE,
              {
                className: 'params',
                begin: '\\(', end: '\\)',
                contains: [
                  'self',
                  VARIABLE,
                  hljs.C_BLOCK_COMMENT_MODE,
                  STRING,
                  NUMBER
                ]
              }
            ]
          },
          {
            className: 'class',
            beginKeywords: 'class interface', end: '{', excludeEnd: true,
            illegal: /[:\(\$"]/,
            contains: [
              {beginKeywords: 'extends implements'},
              hljs.UNDERSCORE_TITLE_MODE
            ]
          },
          {
            beginKeywords: 'namespace', end: ';',
            illegal: /[\.']/,
            contains: [hljs.UNDERSCORE_TITLE_MODE]
          },
          {
            beginKeywords: 'use', end: ';',
            contains: [hljs.UNDERSCORE_TITLE_MODE]
          },
          {
            begin: '=>' // No markup, just a relevance booster
          },
          STRING,
          NUMBER
        ]
      };
    });
    //注册Python
    hljs.registerLanguage("python",function(hljs){
      var KEYWORDS = {
        keyword:
          'and elif is global as in if from raise for except finally print import pass return ' +
          'exec else break not with class assert yield try while continue del or def lambda ' +
          'async await nonlocal|10 None True False',
        built_in:
          'Ellipsis NotImplemented'
      };
      var PROMPT = {
        className: 'meta',  begin: /^(>>>|\.\.\.) /
      };
      var SUBST = {
        className: 'subst',
        begin: /\{/, end: /\}/,
        keywords: KEYWORDS,
        illegal: /#/
      };
      var STRING = {
        className: 'string',
        contains: [hljs.BACKSLASH_ESCAPE],
        variants: [
          {
            begin: /(u|b)?r?'''/, end: /'''/,
            contains: [hljs.BACKSLASH_ESCAPE, PROMPT],
            relevance: 10
          },
          {
            begin: /(u|b)?r?"""/, end: /"""/,
            contains: [hljs.BACKSLASH_ESCAPE, PROMPT],
            relevance: 10
          },
          {
            begin: /(fr|rf|f)'''/, end: /'''/,
            contains: [hljs.BACKSLASH_ESCAPE, PROMPT, SUBST]
          },
          {
            begin: /(fr|rf|f)"""/, end: /"""/,
            contains: [hljs.BACKSLASH_ESCAPE, PROMPT, SUBST]
          },
          {
            begin: /(u|r|ur)'/, end: /'/,
            relevance: 10
          },
          {
            begin: /(u|r|ur)"/, end: /"/,
            relevance: 10
          },
          {
            begin: /(b|br)'/, end: /'/
          },
          {
            begin: /(b|br)"/, end: /"/
          },
          {
            begin: /(fr|rf|f)'/, end: /'/,
            contains: [hljs.BACKSLASH_ESCAPE, SUBST]
          },
          {
            begin: /(fr|rf|f)"/, end: /"/,
            contains: [hljs.BACKSLASH_ESCAPE, SUBST]
          },
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE
        ]
      };
      var NUMBER = {
        className: 'number', relevance: 0,
        variants: [
          {begin: hljs.BINARY_NUMBER_RE + '[lLjJ]?'},
          {begin: '\\b(0o[0-7]+)[lLjJ]?'},
          {begin: hljs.C_NUMBER_RE + '[lLjJ]?'}
        ]
      };
      var PARAMS = {
        className: 'params',
        begin: /\(/, end: /\)/,
        contains: ['self', PROMPT, NUMBER, STRING]
      };
      SUBST.contains = [STRING, NUMBER, PROMPT];
      return {
        aliases: ['py', 'gyp', 'ipython'],
        keywords: KEYWORDS,
        illegal: /(<\/|->|\?)|=>/,
        contains: [
          PROMPT,
          NUMBER,
          STRING,
          hljs.HASH_COMMENT_MODE,
          {
            variants: [
              {className: 'function', beginKeywords: 'def'},
              {className: 'class', beginKeywords: 'class'}
            ],
            end: /:/,
            illegal: /[${=;\n,]/,
            contains: [
              hljs.UNDERSCORE_TITLE_MODE,
              PARAMS,
              {
                begin: /->/, endsWithParent: true,
                keywords: 'None'
              }
            ]
          },
          {
            className: 'meta',
            begin: /^[\t ]*@/, end: /$/
          },
          {
            begin: /\b(print|exec)\(/ // don’t highlight keywords-turned-functions in Python 3
          }
        ]
      };
    });
    //注册Less
    hljs.registerLanguage("less",function(hljs){
      var IDENT_RE        = '[\\w-]+'; // yes, Less identifiers may begin with a digit
      var INTERP_IDENT_RE = '(' + IDENT_RE + '|@{' + IDENT_RE + '})';
    
      /* Generic Modes */
    
      var RULES = [], VALUE = []; // forward def. for recursive modes
    
      var STRING_MODE = function(c) { return {
        // Less strings are not multiline (also include '~' for more consistent coloring of "escaped" strings)
        className: 'string', begin: '~?' + c + '.*?' + c
      };};
    
      var IDENT_MODE = function(name, begin, relevance) { return {
        className: name, begin: begin, relevance: relevance
      };};
    
      var PARENS_MODE = {
        // used only to properly balance nested parens inside mixin call, def. arg list
        begin: '\\(', end: '\\)', contains: VALUE, relevance: 0
      };
    
      // generic Less highlighter (used almost everywhere except selectors):
      VALUE.push(
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        STRING_MODE("'"),
        STRING_MODE('"'),
        hljs.CSS_NUMBER_MODE, // fixme: it does not include dot for numbers like .5em :(
        {
          begin: '(url|data-uri)\\(',
          starts: {className: 'string', end: '[\\)\\n]', excludeEnd: true}
        },
        IDENT_MODE('number', '#[0-9A-Fa-f]+\\b'),
        PARENS_MODE,
        IDENT_MODE('variable', '@@?' + IDENT_RE, 10),
        IDENT_MODE('variable', '@{'  + IDENT_RE + '}'),
        IDENT_MODE('built_in', '~?`[^`]*?`'), // inline javascript (or whatever host language) *multiline* string
        { // @media features (it’s here to not duplicate things in AT_RULE_MODE with extra PARENS_MODE overriding):
          className: 'attribute', begin: IDENT_RE + '\\s*:', end: ':', returnBegin: true, excludeEnd: true
        },
        {
          className: 'meta',
          begin: '!important'
        }
      );
    
      var VALUE_WITH_RULESETS = VALUE.concat({
        begin: '{', end: '}', contains: RULES
      });
    
      var MIXIN_GUARD_MODE = {
        beginKeywords: 'when', endsWithParent: true,
        contains: [{beginKeywords: 'and not'}].concat(VALUE) // using this form to override VALUE’s 'function' match
      };
    
      /* Rule-Level Modes */
    
      var RULE_MODE = {
        begin: INTERP_IDENT_RE + '\\s*:', returnBegin: true, end: '[;}]',
        relevance: 0,
        contains: [
          {
            className: 'attribute',
            begin: INTERP_IDENT_RE, end: ':', excludeEnd: true,
            starts: {
              endsWithParent: true, illegal: '[<=$]',
              relevance: 0,
              contains: VALUE
            }
          }
        ]
      };
    
      var AT_RULE_MODE = {
        className: 'keyword',
        begin: '@(import|media|charset|font-face|(-[a-z]+-)?keyframes|supports|document|namespace|page|viewport|host)\\b',
        starts: {end: '[;{}]', returnEnd: true, contains: VALUE, relevance: 0}
      };
    
      // variable definitions and calls
      var VAR_RULE_MODE = {
        className: 'variable',
        variants: [
          // using more strict pattern for higher relevance to increase chances of Less detection.
          // this is *the only* Less specific statement used in most of the sources, so...
          // (we’ll still often loose to the css-parser unless there's '//' comment,
          // simply because 1 variable just can't beat 99 properties :)
          {begin: '@' + IDENT_RE + '\\s*:', relevance: 15},
          {begin: '@' + IDENT_RE}
        ],
        starts: {end: '[;}]', returnEnd: true, contains: VALUE_WITH_RULESETS}
      };
    
      var SELECTOR_MODE = {
        // first parse unambiguous selectors (i.e. those not starting with tag)
        // then fall into the scary lookahead-discriminator variant.
        // this mode also handles mixin definitions and calls
        variants: [{
          begin: '[\\.#:&\\[>]', end: '[;{}]'  // mixin calls end with ';'
          }, {
          begin: INTERP_IDENT_RE, end: '{'
        }],
        returnBegin: true,
        returnEnd:   true,
        illegal: '[<=\'$"]',
        relevance: 0,
        contains: [
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          MIXIN_GUARD_MODE,
          IDENT_MODE('keyword',  'all\\b'),
          IDENT_MODE('variable', '@{'  + IDENT_RE + '}'),     // otherwise it’s identified as tag
          IDENT_MODE('selector-tag',  INTERP_IDENT_RE + '%?', 0), // '%' for more consistent coloring of @keyframes "tags"
          IDENT_MODE('selector-id', '#' + INTERP_IDENT_RE),
          IDENT_MODE('selector-class', '\\.' + INTERP_IDENT_RE, 0),
          IDENT_MODE('selector-tag',  '&', 0),
          {className: 'selector-attr', begin: '\\[', end: '\\]'},
          {className: 'selector-pseudo', begin: /:(:)?[a-zA-Z0-9\_\-\+\(\)"'.]+/},
          {begin: '\\(', end: '\\)', contains: VALUE_WITH_RULESETS}, // argument list of parametric mixins
          {begin: '!important'} // eat !important after mixin call or it will be colored as tag
        ]
      };
    
      RULES.push(
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        AT_RULE_MODE,
        VAR_RULE_MODE,
        RULE_MODE,
        SELECTOR_MODE
      );
    
      return {
        case_insensitive: true,
        illegal: '[=>\'/<($"]',
        contains: RULES
      };
    });
    //注册Lua
    hljs.registerLanguage("lua",function(hljs){
      var OPENING_LONG_BRACKET = '\\[=*\\[';
      var CLOSING_LONG_BRACKET = '\\]=*\\]';
      var LONG_BRACKETS = {
        begin: OPENING_LONG_BRACKET, end: CLOSING_LONG_BRACKET,
        contains: ['self']
      };
      var COMMENTS = [
        hljs.COMMENT('--(?!' + OPENING_LONG_BRACKET + ')', '$'),
        hljs.COMMENT(
          '--' + OPENING_LONG_BRACKET,
          CLOSING_LONG_BRACKET,
          {
            contains: [LONG_BRACKETS],
            relevance: 10
          }
        )
      ];
      return {
        lexemes: hljs.UNDERSCORE_IDENT_RE,
        keywords: {
          literal: "true false nil",
          keyword: "and break do else elseif end for goto if in local not or repeat return then until while",
          built_in:
            //Metatags and globals:
            '_G _ENV _VERSION __index __newindex __mode __call __metatable __tostring __len ' +
            '__gc __add __sub __mul __div __mod __pow __concat __unm __eq __lt __le assert ' +
            //Standard methods and properties:
            'collectgarbage dofile error getfenv getmetatable ipairs load loadfile loadstring' +
            'module next pairs pcall print rawequal rawget rawset require select setfenv' +
            'setmetatable tonumber tostring type unpack xpcall arg self' +
            //Library methods and properties (one line per library):
            'coroutine resume yield status wrap create running debug getupvalue ' +
            'debug sethook getmetatable gethook setmetatable setlocal traceback setfenv getinfo setupvalue getlocal getregistry getfenv ' +
            'io lines write close flush open output type read stderr stdin input stdout popen tmpfile ' +
            'math log max acos huge ldexp pi cos tanh pow deg tan cosh sinh random randomseed frexp ceil floor rad abs sqrt modf asin min mod fmod log10 atan2 exp sin atan ' +
            'os exit setlocale date getenv difftime remove time clock tmpname rename execute package preload loadlib loaded loaders cpath config path seeall ' +
            'string sub upper len gfind rep find match char dump gmatch reverse byte format gsub lower ' +
            'table setn insert getn foreachi maxn foreach concat sort remove'
        },
        contains: COMMENTS.concat([
          {
            className: 'function',
            beginKeywords: 'function', end: '\\)',
            contains: [
              hljs.inherit(hljs.TITLE_MODE, {begin: '([_a-zA-Z]\\w*\\.)*([_a-zA-Z]\\w*:)?[_a-zA-Z]\\w*'}),
              {
                className: 'params',
                begin: '\\(', endsWithParent: true,
                contains: COMMENTS
              }
            ].concat(COMMENTS)
          },
          hljs.C_NUMBER_MODE,
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE,
          {
            className: 'string',
            begin: OPENING_LONG_BRACKET, end: CLOSING_LONG_BRACKET,
            contains: [LONG_BRACKETS],
            relevance: 5
          }
        ])
      };
    });
    //注册TypeScript
    hljs.registerLanguage("typescript",function(hljs){
      var JS_IDENT_RE = '[A-Za-z$_][0-9A-Za-z$_]*';
      var KEYWORDS = {
        keyword:
          'in if for while finally var new function do return void else break catch ' +
          'instanceof with throw case default try this switch continue typeof delete ' +
          'let yield const class public private protected get set super ' +
          'static implements enum export import declare type namespace abstract ' +
          'as from extends async await',
        literal:
          'true false null undefined NaN Infinity',
        built_in:
          'eval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent ' +
          'encodeURI encodeURIComponent escape unescape Object Function Boolean Error ' +
          'EvalError InternalError RangeError ReferenceError StopIteration SyntaxError ' +
          'TypeError URIError Number Math Date String RegExp Array Float32Array ' +
          'Float64Array Int16Array Int32Array Int8Array Uint16Array Uint32Array ' +
          'Uint8Array Uint8ClampedArray ArrayBuffer DataView JSON Intl arguments require ' +
          'module console window document any number boolean string void Promise'
      };
    
      var DECORATOR = {
        className: 'meta',
        begin: '@' + JS_IDENT_RE,
      };
    
      var ARGS =
      {
        begin: '\\(',
        end: /\)/,
        keywords: KEYWORDS,
        contains: [
          'self',
          hljs.QUOTE_STRING_MODE,
          hljs.APOS_STRING_MODE,
          hljs.NUMBER_MODE
        ]
      };
    
      var PARAMS = {
        className: 'params',
        begin: /\(/, end: /\)/,
        excludeBegin: true,
        excludeEnd: true,
        keywords: KEYWORDS,
        contains: [
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          DECORATOR,
          ARGS
        ]
      };
    
      return {
        aliases: ['ts'],
        keywords: KEYWORDS,
        contains: [
          {
            className: 'meta',
            begin: /^\s*['"]use strict['"]/
          },
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE,
          { // template string
            className: 'string',
            begin: '`', end: '`',
            contains: [
              hljs.BACKSLASH_ESCAPE,
              {
                className: 'subst',
                begin: '\\$\\{', end: '\\}'
              }
            ]
          },
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          {
            className: 'number',
            variants: [
              { begin: '\\b(0[bB][01]+)' },
              { begin: '\\b(0[oO][0-7]+)' },
              { begin: hljs.C_NUMBER_RE }
            ],
            relevance: 0
          },
          { // "value" container
            begin: '(' + hljs.RE_STARTERS_RE + '|\\b(case|return|throw)\\b)\\s*',
            keywords: 'return throw case',
            contains: [
              hljs.C_LINE_COMMENT_MODE,
              hljs.C_BLOCK_COMMENT_MODE,
              hljs.REGEXP_MODE,
              {
                className: 'function',
                begin: '(\\(.*?\\)|' + hljs.IDENT_RE + ')\\s*=>', returnBegin: true,
                end: '\\s*=>',
                contains: [
                  {
                    className: 'params',
                    variants: [
                      {
                        begin: hljs.IDENT_RE
                      },
                      {
                        begin: /\(\s*\)/,
                      },
                      {
                        begin: /\(/, end: /\)/,
                        excludeBegin: true, excludeEnd: true,
                        keywords: KEYWORDS,
                        contains: [
                          'self',
                          hljs.C_LINE_COMMENT_MODE,
                          hljs.C_BLOCK_COMMENT_MODE
                        ]
                      }
                    ]
                  }
                ]
              }
            ],
            relevance: 0
          },
          {
            className: 'function',
            begin: 'function', end: /[\{;]/, excludeEnd: true,
            keywords: KEYWORDS,
            contains: [
              'self',
              hljs.inherit(hljs.TITLE_MODE, { begin: JS_IDENT_RE }),
              PARAMS
            ],
            illegal: /%/,
            relevance: 0 // () => {} is more typical in TypeScript
          },
          {
            beginKeywords: 'constructor', end: /\{/, excludeEnd: true,
            contains: [
              'self',
              PARAMS
            ]
          },
          { // prevent references like module.id from being higlighted as module definitions
            begin: /module\./,
            keywords: { built_in: 'module' },
            relevance: 0
          },
          {
            beginKeywords: 'module', end: /\{/, excludeEnd: true
          },
          {
            beginKeywords: 'interface', end: /\{/, excludeEnd: true,
            keywords: 'interface extends'
          },
          {
            begin: /\$[(.]/ // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
          },
          {
            begin: '\\.' + hljs.IDENT_RE, relevance: 0 // hack: prevents detection of keywords after dots
          },
          DECORATOR,
          ARGS
        ]
      };
    });
    //注册VB.NET
    hljs.registerLanguage("vbnet",function(hljs){
      return {
        aliases: ['vb'],
        case_insensitive: true,
        keywords: {
          keyword:
            'addhandler addressof alias and andalso aggregate ansi as assembly auto binary by byref byval ' + /* a-b */
            'call case catch class compare const continue custom declare default delegate dim distinct do ' + /* c-d */
            'each equals else elseif end enum erase error event exit explicit finally for friend from function ' + /* e-f */
            'get global goto group handles if implements imports in inherits interface into is isfalse isnot istrue ' + /* g-i */
            'join key let lib like loop me mid mod module mustinherit mustoverride mybase myclass ' + /* j-m */
            'namespace narrowing new next not notinheritable notoverridable ' + /* n */
            'of off on operator option optional or order orelse overloads overridable overrides ' + /* o */
            'paramarray partial preserve private property protected public ' + /* p */
            'raiseevent readonly redim rem removehandler resume return ' + /* r */
            'select set shadows shared skip static step stop structure strict sub synclock ' + /* s */
            'take text then throw to try unicode until using when where while widening with withevents writeonly xor', /* t-x */
          built_in:
            'boolean byte cbool cbyte cchar cdate cdec cdbl char cint clng cobj csbyte cshort csng cstr ctype ' +  /* b-c */
            'date decimal directcast double gettype getxmlnamespace iif integer long object ' + /* d-o */
            'sbyte short single string trycast typeof uinteger ulong ushort', /* s-u */
          literal:
            'true false nothing'
        },
        illegal: '//|{|}|endif|gosub|variant|wend|^\\$ ', /* reserved deprecated keywords */
        contains: [
          hljs.inherit(hljs.QUOTE_STRING_MODE, {contains: [{begin: '""'}]}),
          hljs.COMMENT(
            '\'',
            '$',
            {
              returnBegin: true,
              contains: [
                {
                  className: 'doctag',
                  begin: '\'\'\'|<!--|-->',
                  contains: [hljs.PHRASAL_WORDS_MODE]
                },
                {
                  className: 'doctag',
                  begin: '</?', end: '>',
                  contains: [hljs.PHRASAL_WORDS_MODE]
                }
              ]
            }
          ),
          hljs.C_NUMBER_MODE,
          {
            className: 'meta',
            begin: '#', end: '$',
            keywords: {'meta-keyword': 'if else elseif end region externalsource'}
          }
        ]
      };
    });
    //注册VBScript
    hljs.registerLanguage("vbscript",function(hljs){
      return {
        aliases: ['vbs'],
        case_insensitive: true,
        keywords: {
          keyword:
            'call class const dim do loop erase execute executeglobal exit for each next function ' +
            'if then else on error option explicit new private property let get public randomize ' +
            'redim rem select case set stop sub while wend with end to elseif is or xor and not ' +
            'class_initialize class_terminate default preserve in me byval byref step resume goto',
          built_in:
            'lcase month vartype instrrev ubound setlocale getobject rgb getref string ' +
            'weekdayname rnd dateadd monthname now day minute isarray cbool round formatcurrency ' +
            'conversions csng timevalue second year space abs clng timeserial fixs len asc ' +
            'isempty maths dateserial atn timer isobject filter weekday datevalue ccur isdate ' +
            'instr datediff formatdatetime replace isnull right sgn array snumeric log cdbl hex ' +
            'chr lbound msgbox ucase getlocale cos cdate cbyte rtrim join hour oct typename trim ' +
            'strcomp int createobject loadpicture tan formatnumber mid scriptenginebuildversion ' +
            'scriptengine split scriptengineminorversion cint sin datepart ltrim sqr ' +
            'scriptenginemajorversion time derived eval date formatpercent exp inputbox left ascw ' +
            'chrw regexp server response request cstr err',
          literal:
            'true false null nothing empty'
        },
        illegal: '//',
        contains: [
          hljs.inherit(hljs.QUOTE_STRING_MODE, {contains: [{begin: '""'}]}),
          hljs.COMMENT(
            /'/,
            /$/,
            {
              relevance: 0
            }
          ),
          hljs.C_NUMBER_MODE
        ]
      };
    });
    //注册VBScript in HTML
    hljs.registerLanguage("vbscript-html",function(hljs){
      return {
        subLanguage: 'xml',
        contains: [
          {
            begin: '<%', end: '%>',
            subLanguage: 'vbscript'
          }
        ]
      };
    });
    return hljs;
  }));
  
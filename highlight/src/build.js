// const hljs=require("./highlight.js");

// hljs.registerLanguage('sql', require('./languages/sql'));

import hljs from './highlight.js';
import sql from './languages/sql';
hljs.registerLanguage('sql', sql);
export default hljs;
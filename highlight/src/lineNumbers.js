/**
 * 加入代码行号
 */
(function(window, document){
    //创建行号样式
    function createLineNumbersStyle(){
      var lineNumbersStyle=[
        ".{0} ul {",
          "list-style: decimal;",
          "margin: 0px 0px 0 40px !important;",
          "padding: 0px;}",
        ".{0} ul li {",
          "list-style: decimal;",
          "border-left: 1px solid #ddd !important;",
          "padding: 5px!important;",
          "margin: 0 !important;",
          "line-height: 14px;",
          "word-break: break-all;",
          "word-wrap: break-word;}"
      ];
      var styleEl = document.createElement("style");
      styleEl.type = "text/css";
      //styleEl.innerHTML = lineNumbersStyle.join("").format("hljs");
      styleEl.innerHTML =StringFormat(lineNumbersStyle.join(""),"hljs");
      document.getElementsByTagName("head")[0].appendChild(styleEl);
    }
    //初始化代码行号
    function initLineNumbersOnLoad(){
      createLineNumbersStyle();
      var codeList=document.querySelectorAll('pre code');
      var block={};
      for(var i=0;i<codeList.length;i++){
        var codeHtml=codeList[i].innerHTML;
        codeHtml="<ul><li>"+codeHtml.replace(/\n/g, "\n</li><li>") + "\n</li></ul>";
        codeList[i].innerHTML=codeHtml;
      }
    }
    if(window.hljs){
      window.hljs.initLineNumbersOnLoad=initLineNumbersOnLoad;
    }
    else{
      window.console.error("highlight.js not find!");
    }
  })(window, document);
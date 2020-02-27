/**
 * 加入代码复制按钮
 */
(function(window, document){
    /**
     *Tag转义符定义
     */
    var tagsToReplace = {   
      '&lt;': '<',   
      '&gt;': '>',
    }; 
    function replaceTag(tag){
      return tagsToReplace[tag] || tag;  
    }
    //生成Tag转义符正则表达式
    var regTag=function getRegTag(){
      var TempReg="";
      for(var key in tagsToReplace) {
        TempReg+="("+key+")|";
      }
      TempReg = TempReg.replace(/\|$/g, "");
      var reg=new RegExp(TempReg,"g");
      return reg;
    }();
  
  /**
   *复制HTML内容到剪贴板
   * @method getCode
   * @param {domEvent} event 复制按钮点击事件 
   */
    function getCode(event){
      event.preventDefault();
      //window.event? window.event.cancelBubble = true : event.stopPropagation();
      var copyBtnEl= event.target || event.srcElement;
      var preEl=copyBtnEl.parentElement||copyBtnEl.parentNode;
      var codeEl=preEl.getElementsByTagName("code")[0];
      var agent = navigator.userAgent.toLowerCase();
      var ie=/msie\s|trident.*rv:([\w.]+)/.test(agent);
      //ie6使用其他的会有一段空白出现
      var fillChar=ie && browser.version == '6' ? '\ufeff' : '\u200B';
      var blockList = {address:1,blockquote:1,center:1,dir:1,div:1,dl:1,fieldset:1,form:1,h1:1,h2:1,h3:1,h4:1,h5:1,h6:1,hr:1,isindex:1,menu:1,noframes:1,ol:1,p:1,pre:1,table:1,ul:1,li:1};
      //块结构元素列表
      var $block=blockList;
      var reg = new RegExp(fillChar, 'g');
      var html = codeEl.innerHTML.replace(/[\n\r]/g, '');//ie要先去了\n在处理
      html = html.replace(/<(p|div)[^>]*>(<br\/?>|&nbsp;)<\/\1>/gi, '\n')
        .replace(/<br\/?>/gi, '\n')
        .replace(/<[^>/]+>/g, '')
        .replace(/(\n)?<\/([^>]+)>/g, function (a, b, c) {
          return $block[c] ? '\n' : b ? b : '';
      });
      //取出来的空格会有c2a0会变成乱码，处理这种情况\u00a0
      var codeStr=html.replace(reg, '').replace(/\u00a0/g, ' ').replace(/&nbsp;/g, ' ').replace(regTag, replaceTag).replace(/\n$/g,'');
      try {  
        var scrollTop = document.documentElement.scrollTop;
        var codeTxt = document.createElement("textarea");
        codeTxt.value = codeStr;
        codeTxt.id="codeStr";
        codeTxt.style.position = "absolute";
        codeTxt.style.left = "-9999px";
        codeTxt.style.top =scrollTop+"px";
        document.getElementsByTagName("body")[0].appendChild(codeTxt);
        codeTxt.select();
        var bl=document.execCommand('copy');
        copyBtnEl.innerText= bl ? copyBtnObj.statusTitle.succeed : copyBtnObj.statusTitle.fail, bl && setTimeout(function () {
          copyBtnEl.innerText = copyBtnObj.statusTitle.normal;
        }, 1e3);
      } 
      catch (errTxt) {
        copyBtnEl.innerText = copyBtnObj.statusTitle.fail;
        window.console.error(errTxt);
      }
      finally {
        var codeTxt=document.getElementById("codeStr");
        document.getElementsByTagName("body")[0].removeChild(codeTxt);
      }
    }
    var copyBtnObj={
      btnClsName:"hljs-button",
      statusTitle:{
        normal:"复制",
        succeed:"复制成功",
        fail:"复制失败"
      }
    };
    /**
     * 创建复制按钮样式
     */
    function createCopyButtonStyle(){
      var styles=[
        "pre{position: relative;}", 
        "pre:hover .{0}{display: block;}", 
        ".{0}{",
          "display: none;", "position: absolute;", "right: -2px;", "top: -3px;", "font-size: 12px;",
          "color: #4d4d4d;", "background-color: white;", "padding: 2px 8px;", "margin: 8px;",
          "border-radius: 4px;", "cursor: pointer;",
          "box-shadow: 0 2px 4px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.05);", "}", 
        ".{0}:after{",
          "content: attr(data-title);","}"
      ];
      var styleEl = document.createElement("style");
      styleEl.type = "text/css";
      //styleEl.innerHTML = styles.join("").format(copyBtnObj.btnClsName);
      styleEl.innerHTML = StringFormat(styles.join(""),copyBtnObj.btnClsName);
      document.getElementsByTagName("head")[0].appendChild(styleEl);
    }
    /**
     * 初始化复制按钮
     */
    function initCopyButtonOnLoad(){
      createCopyButtonStyle();
      var preList=document.querySelectorAll('pre');
      for(var i=0;i<preList.length;i++){
        //添加复制按钮
        var preHtml=preList[i].innerHTML;
        var copyBtnFn="hljs.getCode(event)";
        //preHtml += '<div class="{0}" name="{0}" onclick="{2}">{1}</div>'.format(copyBtnObj.btnClsName,copyBtnObj.statusTitle.normal,copyBtnFn);
        preHtml +=StringFormat('<div class="{0}" name="{0}" onclick="{2}">{1}</div>',copyBtnObj.btnClsName,copyBtnObj.statusTitle.normal,copyBtnFn);
        preList[i].innerHTML=preHtml;
      }
    }
    if(window.hljs){
      window.hljs.initCopyButtonOnLoad=initCopyButtonOnLoad;
      window.hljs.getCode=getCode;
    }
    else{
      window.console.error("highlight.js not find!");
    }
  })(window, document);
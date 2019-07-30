/*
 * @Author: JohnnyLi 
 * @Date: 2019-07-01 17:24:54 
 * @Last Modified by: JohnnyLi
 * @Last Modified time: 2019-07-30 15:06:20
 */
(function ($) {
    'use strict';
    var JDialog = function (element, options) {
        this.$element = $(element);
        this.$body=$("html body");
        this.$doc=$(document);
        FormatArray(JDialog.Defaults,options);
        this.options = $.extend({}, JDialog.Defaults, options);
        this.currentDialog="";
        this.currentDialogID="";
        this.init();
    }
    JDialog.Version = '1.1.0';
    JDialog.Defaults = {
        title:"Dialog",     //标题
        width:470,
        height:220,
        minWidth:150,       //最小宽度
        minHeight:150,      //最小高度
        closeOnEscape:true, //对话框有焦点时，按下ESC键是否关闭对话框
        resizable:true,     //是否允许拖拽缩放窗体大小
        menus:[{
            text:"munu1",   //必填。菜单显示文本
            type:"menu",    //必填。菜单类型。menu/ddmenu/sddmenu(常规菜单/下拉菜单/分裂式下拉菜单)
            item:[{         //子菜单。只当type为ddmenu或sddmenu时有效且必填
                text:"submenu1", //菜单显示文本
                fn:function(){}        //菜单函数
              }],
            fn:function(){}        //菜单函数，只当type为menu或sddmenu时有效且必填
          }
        ],
        buttons:[{           //按钮
            id:"",              //如不填写id,将有程序生成id。
            text:"btn1",        //按钮显示文本
            fn:function(){}     //函数
        }],        
        close:function(event){}, //对话框关闭后(点击关闭按钮之后)的回调函数
    }
    JDialog.prototype.init=function(){
        var _this=this;
        var options=_this.options;
        var id=DialogID(_this);
        var DialogId="JDialog_"+id;
        _this.currentDialogID=DialogId;
        initOptions(_this);
        RenderDialog(_this);
        BindEvent(_this);
        Interactions(_this); 
    }
    JDialog.prototype.show=function(){
        //对话框打开位置
        var left= ($(window).width()*0.5)-(this.currentDialog.width()*0.5); //水平居中
        var top=($(window).height()*0.5)-(this.currentDialog.height()*0.5); //垂直居中;
        this.currentDialog.css({"left":left,"top":top});
        this.$body.append("<div class='JDialog-backdrop'></div>");
        this.$body.addClass("JDialog-open");
        this.currentDialog.show();
        CalcModalDialogHeight(this);
    }
    JDialog.prototype.hide=function(){
        this.currentDialog.hide();
        this.$body.find(".JDialog-backdrop").remove();
        this.$body.removeClass("JDialog-open");
    }
    JDialog.prototype.destroy=function(){
        this.currentDialog.remove();
        this.$element.removeData("bsmodal");
    }
    /**
     * 渲染对话框
     * @param {object} _this object this
     */
    var RenderDialog=function(_this){
        var options=_this.options;
        var dialogHtml=[];
        var width=options.width;
        width=width<options.minWidth?options.minWidth:width;
        var height=options.height;
        height=height<options.minHeight?options.minHeight:height;
        //Dialog Html
        dialogHtml.push("<div id='{0}' class='JDialog' tabindex='-1' style='display:none;'>".format(_this.currentDialogID));
        dialogHtml.push("<div class='JDialog-dialog' style='width:{0};height:{1}'>".format(width+"px",height+"px"));
        //上边框拖拽
        dialogHtml.push("<div class='JDialog-resizable-handle {0}'></div>".format(options.resizable?"JDialog-resizable-n":""));
        //右边框拖拽
        dialogHtml.push("<div class='JDialog-resizable-handle {0}'></div>".format(options.resizable?"JDialog-resizable-e":""));
        //下边框拖拽
        dialogHtml.push("<div class='JDialog-resizable-handle {0}'></div>".format(options.resizable?"JDialog-resizable-s":""));
        //左边框拖拽
        dialogHtml.push("<div class='JDialog-resizable-handle {0}'></div>".format(options.resizable?"JDialog-resizable-w":""));
        //右下角拖拽
        dialogHtml.push("<div class='JDialog-resizable-handle {0}'></div>".format(options.resizable?"JDialog-resizable-se":""));
        //左下角拖拽
        dialogHtml.push("<div class='JDialog-resizable-handle {0}'></div>".format(options.resizable?"JDialog-resizable-sw":""));

        dialogHtml.push("<div class='JDialog-content'>");
        
        //Dialog Header
        dialogHtml.push("<div class='JDialog-header'>");
        //Close btn
        dialogHtml.push("<button type='button' class='close'><span>×</span></button>");
        //Dialog Title
        dialogHtml.push("<h4 class='JDialog-title'>{0}</h4>".format(options.title));
        dialogHtml.push("</div>");

        //Dialog menu
        dialogHtml.push("<div class='JDialog-menu'>");
        
        dialogHtml.push("</div>");
        //Dialog Body
        dialogHtml.push("<div class='JDialog-body'>");
        dialogHtml.push(_this.$element.html());
        dialogHtml.push("</div>");

        //Dialog Footer    
        if(options.buttons.length>0){
            dialogHtml.push("<div class='JDialog-footer'>");
            $.each(options.buttons,function(index,item){
                dialogHtml.push("<button class='btn btn-default' id='{1}'>{0}</button>".format(item.text,item.id));
            });
            dialogHtml.push("</div>");
        }
        
        dialogHtml.push("</div>");
        dialogHtml.push("</div>");
        dialogHtml.push("</div>");
        _this.$body.append(dialogHtml.join(""));
        _this.currentDialog=$("#"+_this.currentDialogID);
    }
       /**
     * 生成对话框id编号
     * @returns {number}
     */
    var DialogID=function(_this){
        var modals=_this.$body.children(".JDialog");
        var modalIDSeqs=[];
        modals.each(function(index,element){
            var $el=$(element);
            var idSeq=parseInt($el.attr("id").replace("JDialog_",""));
            modalIDSeqs.push(idSeq);
        });
        var maxIDSeq=modalIDSeqs.length?modalIDSeqs.max():0;
        var id=maxIDSeq+1
        return id;
    }
    /**
     *交互，对话框拖动，改变大小等交互
     * @param {*} _this object this
     */
    var Interactions=function(_this){
        var options=_this.options;
        //对话框拖拽
        _this.currentDialog.find(".JDialog-header").off().mouseover(function(){
            $(this).css("cursor","move");
		}).mousedown(function(e){
		    var move = true; 
		    var x = e.pageX - $(this).parent().offset().left;
            var y = e.pageY - $(this).parent().offset().top; 
		    _this.$doc.mousemove(function (e) { 
		        if (move) { 
			        _this.currentDialog.offset({left:e.pageX - x, top:e.pageY - y}); 	
		        } 
		    }).mouseup(function(){
                move = false;
                _this.$doc.off("mousemove mouseup");
            });
        });
        //缩放
        if(options.resizable){
            //边框拖动改变大小
            _this.currentDialog.find(".JDialog-dialog .JDialog-resizable-handle").off().mousedown(function(e){
                var $this=$(this);
                var classList=$this.attr("class");
                var dir=classList.split(" ")[1].split("-")[2];
                var clickY,firstClickY,offsetY, topOffset,modalDialogHeight,clickX,offsetX,firstClickX, leftOffset,dragging,modalDialogWidth;
                dragging = true;
                topOffset = $this.parent(".JDialog-dialog").offset().top;
                firstClickY=e.pageY;
                modalDialogHeight=$this.parent(".JDialog-dialog").outerHeight();                
                leftOffset = $this.parent(".JDialog-dialog").offset().left;
                firstClickX=e.pageX;
                modalDialogWidth=$this.parent(".JDialog-dialog").outerWidth();
                _this.$doc.mousemove(function (e) { 
                    if (dragging) {
                        clickY = e.pageY;
                        clickX = e.pageX;
                        offsetX=clickX-firstClickX;
                        offsetY=clickY-firstClickY;
                        switch (dir) {
                            //上边框
                            case "n":
                                var height=modalDialogHeight-offsetY;
                                height=height<options.minHeight?options.minHeight:height;
                                $this.parent(".JDialog-dialog").height(height+"px");
                                $this.parents(".JDialog").css("top",topOffset+modalDialogHeight-height+"px");
                                CalcModalDialogHeight(_this);
                                break;
                            //右边框
                            case "e":
                                var width=modalDialogWidth+offsetX;
                                width=width<options.minWidth?options.minWidth:width;
                                $this.parent(".JDialog-dialog").width(width+'px');
                                break;
                            //下边框
                            case "s":
                                var height=modalDialogHeight+offsetY;
                                height=height<options.minHeight?options.minHeight:height;
                                $this.parent(".JDialog-dialog").height(height + 'px');
                                CalcModalDialogHeight(_this);
                                break;
                            //左边框
                            case "w":
                                var width=modalDialogWidth-offsetX;
                                width=width<options.minWidth?options.minWidth:width;
                                $this.parent(".JDialog-dialog").width(width+ 'px');
                                $this.parents(".JDialog").css("left",leftOffset+(modalDialogWidth-width)+"px");
                                break;
                            //右下角
                            case "se":
                                var width=modalDialogWidth+offsetX;
                                width=width<options.minWidth?options.minWidth:width;
                                var height=modalDialogHeight+offsetY;
                                height=height<options.minHeight?options.minHeight:height;
                                $this.parent(".JDialog-dialog").width(width + 'px');
                                $this.parent(".JDialog-dialog").height(height + 'px');
                                CalcModalDialogHeight(_this);
                                break;
                            //左下角
                            case "sw":
                                var height=modalDialogHeight+offsetY;
                                height=height<options.minHeight?options.minHeight:height;
                                var width=modalDialogWidth-offsetX;
                                width=width<options.minWidth?options.minWidth:width;
                                $this.parent(".JDialog-dialog").width(width + 'px');
                                $this.parent(".JDialog-dialog").height(height+ 'px');
                                $this.parents(".JDialog").css("left",leftOffset+(modalDialogWidth-width)+"px");
                                CalcModalDialogHeight(_this);
                                break;
                            default:
                                break;
                        }
                    }
		        }).mouseup(function(e){
                    dragging = false;
                    e.preventDefault();
                    e.stopPropagation();
                    _this.$doc.off("mousemove mouseup");
                });
            });
        }
    }
    /**
     * 事件绑定
     * @param {object} _this object this
     */
    var BindEvent=function(_this){
        var options=_this.options;
        //对话框关闭按钮
        _this.currentDialog.find("div.JDialog-content div.JDialog-header button.close").off("click").on("click",function(event){
            _this.hide();           
            if (options.close) {
                typeof options.close === 'function' && options.close(event);
            }
        });
        //Footer btn
        _this.currentDialog.find("div.JDialog-content div.JDialog-footer button").off("click").on("click",function(){
            var $targetel=$(this); 
            var id=$targetel.attr("id");
            var temp = $.grep(options.buttons, function(item, index) {
                if(item.id==id)
                    return true;
            }, false);
            options.buttons[0].fn(this,event);
        });
        //ESC关闭对话框
        _this.currentDialog.on("keydown",function(e){
            if(options.closeOnEscape && e.keyCode==27){
                _this.hide();           
                if (options.close) {
                    typeof options.close === 'function' && options.close(event);
                }
            }
        });
    }
    /**
     * 计算modal-body高度
     * @param {*} _this
     */
    var CalcModalDialogHeight=function(_this){
        var options=_this.options;
        var modal_dialog_height=_this.currentDialog.find(".JDialog-dialog").height();
        var modal_body_padding_height=_this.currentDialog.find(".JDialog-body").outerHeight()-_this.currentDialog.find(".JDialog-body").height();
        var modal_header_outer_height= _this.currentDialog.find(".JDialog-header").outerHeight();
        var modal_footer_outer_height =_this.currentDialog.find(".JDialog-footer").outerHeight();
        //console.log("modal_dialog_height:"+modal_dialog_height+",modal_body_padding_height:"+modal_body_padding_height+",modal_header_outer_height:"+modal_header_outer_height+",modal_footer_outer_height:"+modal_footer_outer_height);
        var modal_body_height=(modal_dialog_height-modal_body_padding_height-modal_header_outer_height-modal_footer_outer_height).toString()+"px";
        _this.currentDialog.find(".JDialog-body").height(modal_body_height);
    }
    function Plugin(option) {
        return this.each(function () {
            var $this = $(this);
            var options = typeof option == 'object' && option;
            var data= $this.data('bsmodal');
            if (!data){
                var data=new JDialog(this, options);
                $this.data('bsmodal',data);               
            }
            if (typeof option == 'string') {
                var methods=["show","hide","destroy"];
                if($.inArray(option,methods)<0) {
                    console.error('方法:jDialog("{0}")不存在!'.format(option));
                    return false;
                }
                data[option]();
            }
        })
    }
    /**
     * 格式化 parameter参数中数组里面的Object格式与defaults格式一致
     * @param {object} defaultsObject defaults
     * @param {object} parameterObject parameter
     */
    var FormatArray=function(defaultsObject,parameterObject){
        for (var key in parameterObject) {
            if (parameterObject.hasOwnProperty(key) && $.isArray(parameterObject[key]) && defaultsObject.hasOwnProperty(key)) {
                var newArray=[];
                var paraArry = parameterObject[key];
                for (var i = 0; i < paraArry.length; i++) {
                    var paraobj = paraArry[i];
                    var obj=$.extend(true,{},defaultsObject[key][0],paraobj);
                    newArray.push(obj);
                }
                parameterObject[key]=newArray;
            }
            else{
                if($.isPlainObject(parameterObject[key])){
                    FormatArray(defaultsObject[key],parameterObject[key]);
                }              
            }           
        }
    }
    var initOptions=function(_this){
        var options=_this.options;
        var d=new Date();
        var monthDay=("0" + (d.getMonth() + 1)).slice(-2)+("0" + (d.getDate())).slice(-2);
        var DialogID=_this.currentDialogID.replace(/^.+_/g,"");
        if(options.buttons.length>0){
            $.each(options.buttons,function(index,item){
                if(item.id==""){
                    var r=Math.ceil(Math.random()*100);
                    var id=DialogID+monthDay+index+r;
                    item.id=id;
                }
            });
        }
    }
    var old = $.fn.jDialog;
    $.fn.jDialog = Plugin;
    $.fn.jDialog.Constructor = JDialog;
    $.fn.jDialog.noConflict = function () {
        $.fn.jDialog = old;
        return this;
    }
    /**
     * 字符串模板格式化
     * @example 
     * "abc{0}e{1}fg".format(1,2) 输出 "abc1e2fg"
     * @returns {string}
     */
    if (typeof String.prototype['format'] == 'undefined') {
        String.prototype.format =function () {
            var args = arguments;
            return this.replace(/\{(\d+)\}/g, function(m, i){
                return args[i];
            });
        }
    }
    /**
     * 获取数组的最大值
     * @example
     * [1,3,6,5,7,2].max() 输出 7
     */
    if (typeof Array.prototype['max'] == 'undefined') {
        Array.prototype.max = function() { 
            var max = this[0];
            var len = this.length; 
            for (var i = 1; i < len; i++){ 
                if (this[i] > max) { 
                    max = this[i]; 
                } 
            } 
        return max;
        }
    }
})(jQuery);
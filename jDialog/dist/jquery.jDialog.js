/*
 * @Author: JohnnyLi 
 * @Date: 2019-07-01 17:24:54 
 * @Last Modified by: JohnnyLi
 * @Last Modified time: 2019-11-19 10:33:46
 */
(function ($) {
    'use strict';
    var JDialog = function (element, options) {
        this.$element = $(element);
        this.originalPosition={};
        this.originalElement={};
        this.$body=$("html body");
        this.$doc=$(document);
        FormatArray(JDialog.Defaults,options);
        this.options = $.extend({}, JDialog.Defaults, options);
        EmptyNotExistArray(this.options,options);
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
        autoOpen:true,      //对话框在初始化时自动打开。如果为 false时，对话框将会继续隐藏直到调用show()方法
        menus:[{
            text:"munu1",           //必填。菜单显示文本
            type:"nmenu",           //必填。菜单类型。nmenu/ddmenu/sddmenu(普通菜单/下拉菜单/分裂式下拉菜单)
            subMenus:[{             //子菜单。只当type为ddmenu或sddmenu时有效
                text:"submenu1",    //菜单显示文本
                fn:function(){}     //菜单函数
            }],
            fn:function(){}         //菜单函数，只当type为nmenu或sddmenu时有效且必填
        }],
        buttons:[{                  //按钮
            text:"btn1",            //按钮显示文本
            fn:function(){}         //函数
        }],        
        close:function(event){},    //对话框关闭后(点击关闭按钮之后)的回调函数
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
        var next;
        var originalPosition = this.originalPosition;
        next = originalPosition.parent.children().eq( originalPosition.index );
		if ( next.length && next[0] !== this.originalElement[0] ) {
			next.before( this.originalElement );
		} else {
			originalPosition.parent.append( this.originalElement );
        }
        this.currentDialog.remove();
        this.$body.find(".JDialog-backdrop").remove();
        this.$body.removeClass("JDialog-open");
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
        dialogHtml.push(StringFormat("<div id='{0}' class='JDialog' tabindex='-1' style='display:none;'>",_this.currentDialogID));
        dialogHtml.push(StringFormat("<div class='JDialog-dialog' style='width:{0};height:{1}'>",width+"px",height+"px"));
        //上边框拖拽
        dialogHtml.push(StringFormat("<div class='JDialog-resizable-handle {0}'></div>",options.resizable?"JDialog-resizable-n":""));
        //右边框拖拽
        dialogHtml.push(StringFormat("<div class='JDialog-resizable-handle {0}'></div>",options.resizable?"JDialog-resizable-e":""));
        //下边框拖拽
        dialogHtml.push(StringFormat("<div class='JDialog-resizable-handle {0}'></div>",options.resizable?"JDialog-resizable-s":""));
        //左边框拖拽
        dialogHtml.push(StringFormat("<div class='JDialog-resizable-handle {0}'></div>",options.resizable?"JDialog-resizable-w":""));
        //右下角拖拽
        dialogHtml.push(StringFormat("<div class='JDialog-resizable-handle {0}'></div>",options.resizable?"JDialog-resizable-se":""));
        //左下角拖拽
        dialogHtml.push(StringFormat("<div class='JDialog-resizable-handle {0}'></div>",options.resizable?"JDialog-resizable-sw":""));

        dialogHtml.push("<div class='JDialog-content'>");
        
        //Dialog Header
        dialogHtml.push("<div class='JDialog-header'>");
        //Close btn
        dialogHtml.push("<button type='button' class='close'><span>×</span></button>");
        //Dialog Title
        dialogHtml.push(StringFormat("<h4 class='JDialog-title'>{0}</h4>",options.title));
        dialogHtml.push("</div>");

        //Dialog menu
        if(options.menus.length>0){
            dialogHtml.push("<div class='JDialog-menu'>");
            //dialogHtml.push("<div>");
            dialogHtml.push("<ul class='JDialog-menu-list'>");
            for (var index = 0; index < options.menus.length; index++) {
                var subMenuHtml=[];
                var menuObj = options.menus[index];
                switch (menuObj.type) {
                    case "nmenu":
                        dialogHtml.push(StringFormat("<li class='JDialog-menu-item' data-index='{1}'><div class='nmenu'><a class='btn btn-default'><span>{0}</span></a></div></li>",menuObj.text,index));
                        break;
                    case "ddmenu":
                        if(menuObj.subMenus.length>0){
                            subMenuHtml.push("<ul class='JDialog-submenu-list'>");
                            for (var subindex = 0; subindex < menuObj.subMenus.length; subindex++) {
                                var subMenuObj=menuObj.subMenus[subindex];
                                var subMenuIndex=index.toString()+"-"+subindex.toString();
                                subMenuHtml.push(StringFormat("<li class='JDialog-submenu-item' data-index='{1}'><a>{0}</a></li>",subMenuObj.text,subMenuIndex));
                            }
                            subMenuHtml.push("</ul>")                            
                        }
                        dialogHtml.push(StringFormat("<li class='JDialog-menu-item' data-index='{1}'><div class='ddmenu'><a class='btn btn-default'><span>{0}</span><span class='caret'></span></a></div>{2}</li>",menuObj.text,index,subMenuHtml.join("")));
                        break;
                    case "sddmenu":
                        if(menuObj.subMenus.length>0){
                            subMenuHtml.push("<ul class='JDialog-submenu-list'>");
                            for (var subindex = 0; subindex < menuObj.subMenus.length; subindex++) {
                                var subMenuObj=menuObj.subMenus[subindex];
                                var subMenuIndex=index.toString()+"-"+subindex.toString();
                                subMenuHtml.push(StringFormat("<li class='JDialog-submenu-item' data-index='{1}'><a>{0}</a></li>",subMenuObj.text,subMenuIndex));
                            }
                            subMenuHtml.push("</ul>")                            
                        }
                        dialogHtml.push(StringFormat("<li class='JDialog-menu-item' data-index='{1}'><div class='sddmenu'><a class='btn btn-default'><span>{0}</span></a>|<a class='btn btn-default'><span class='caret'></span></a></div>{2}</li>",menuObj.text,index,subMenuHtml.join("")));
                        break;
                }
            }
            dialogHtml.push("</ul>");
            //dialogHtml.push("</div>");
            dialogHtml.push("</div>");
        }

        //Dialog Body
        dialogHtml.push("<div class='JDialog-body'>");
        dialogHtml.push(_this.$element.clone().show().prop("outerHTML"));
        dialogHtml.push("</div>");

        //Dialog Footer    
        if(options.buttons.length>0){
            dialogHtml.push("<div class='JDialog-footer'>");
            $.each(options.buttons,function(index,item){
                dialogHtml.push(StringFormat("<button class='btn btn-default' data-index='{1}'>{0}</button>",item.text,index));
            });
            dialogHtml.push("</div>");
        }
        
        dialogHtml.push("</div>");
        dialogHtml.push("</div>");
        dialogHtml.push("</div>");
        _this.$body.append(dialogHtml.join(""));
        _this.originalPosition = {
			parent: _this.$element.parent(),
			index: _this.$element.parent().children().index(_this.$element)
        };
        _this.originalElement =_this.$element.clone();
        _this.$element.remove();
        _this.currentDialog=$("#"+_this.currentDialogID);
        _this.$element=_this.currentDialog.find(".JDialog-content .JDialog-body").children().eq(0);
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
        var maxIDSeq=modalIDSeqs.length?ArrayMax(modalIDSeqs):0;
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
            var dataIndex=$targetel.attr("data-index");
            var temp = $.grep(options.buttons, function(item, index) {
                if(index==dataIndex)
                    return true;
            }, false);
            temp[0].fn(this,event);
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
        var to;
        //菜单点击
        _this.currentDialog.find("div.JDialog-content div.JDialog-menu a.btn").off("click").on("click",function(){
            var $targetel=$(this); 
            if($targetel.parents().is(".ddmenu") || ($targetel.parents().is(".sddmenu") && $targetel.children().is(".caret"))) {
                return;
            }
            var dataIndex=$targetel.parents("li.JDialog-menu-item").attr("data-index");
            var temp = $.grep(options.menus, function(item, index) {
                if(index==dataIndex)
                    return true;
            }, false);
            temp[0].fn(this,event);
        });
        //子菜单点击
        _this.currentDialog.find("div.JDialog-content div.JDialog-menu ul.JDialog-submenu-list li.JDialog-submenu-item a").off("click").on("click",function(){
            var $targetel=$(this); 
            _this.currentDialog.find("div.JDialog-content div.JDialog-menu ul.JDialog-submenu-list").hide();
            var dataIndex=$targetel.parents("li.JDialog-submenu-item").attr("data-index").split("-");
            var menuIndex=dataIndex[0];
            var subMenuIndex=dataIndex[1];
            var temp = $.grep(options.menus, function(item, index) {
                if(index==menuIndex){
                    return true;
                }
            }, false);
            var temp=$.grep(temp[0].subMenus, function(item, subIndex) {
                if(subIndex==subMenuIndex){
                    return true;
                }
            }, false);
            temp[0].fn(this,event);
        });
        //子菜单显示
        _this.currentDialog.find("div.JDialog-content div.JDialog-menu a.btn").hover(function(){
            var $targetel=$(this); 
            _this.currentDialog.find("div.JDialog-content div.JDialog-menu ul.JDialog-submenu-list").hide();
            if($targetel.parents().is(".ddmenu") || ($targetel.parents().is(".sddmenu") && $targetel.children().is(".caret"))) {
                var menuItem=$targetel.parents("li.JDialog-menu-item");
                var subMenuList=menuItem.find("ul.JDialog-submenu-list");
                var subMenuItems=subMenuList.find("li.JDialog-submenu-item");
                if(subMenuItems.length>0){
                    to && (clearTimeout(to), to = !1);
                    subMenuList.show();
                }
            }
        },function(){
            var $targetel=$(this); 
            if($targetel.parents().is(".ddmenu") || ($targetel.parents().is(".sddmenu") && $targetel.children().is(".caret"))) {
                var menuItem=$targetel.parents("li.JDialog-menu-item");
                var subMenuList=menuItem.find("ul.JDialog-submenu-list");
                var subMenuItems=subMenuList.find("li.JDialog-submenu-item");
                if(subMenuItems.length>0){
                    to && (clearTimeout(to), to = !1);
                    to = setTimeout(function () {
                        subMenuList.hide();
                    }, 300)
                }
            }
        });
        //子菜单保持显示
        _this.currentDialog.find("div.JDialog-content div.JDialog-menu ul.JDialog-submenu-list").hover(function(){
            var $targetel=$(this); 
            to && (clearTimeout(to), to = !1);
            $targetel.show();         
        },function(){
            var $targetel=$(this); 
            to && (clearTimeout(to), to = !1);
            to = setTimeout(function () {
                $targetel.hide();
            }, 300)
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
        var modal_menu_outer_height= _this.currentDialog.find(".JDialog-menu").outerHeight();
        var modal_footer_outer_height =_this.currentDialog.find(".JDialog-footer").outerHeight();
        //console.log("modal_dialog_height:"+modal_dialog_height+",modal_body_padding_height:"+modal_body_padding_height+",modal_header_outer_height:"+modal_header_outer_height+",modal_footer_outer_height:"+modal_footer_outer_height);
        var modal_body_height=(modal_dialog_height-modal_body_padding_height-modal_header_outer_height-modal_menu_outer_height-modal_footer_outer_height).toString()+"px";
        _this.currentDialog.find(".JDialog-body").height(modal_body_height); 
    }
    function Plugin(option) {
        return this.each(function () {
            var $this = $(this);
            var options = typeof option == 'object' && option;
            var data= $this.data('jDialog');
            if (!data){
                var data=new JDialog(this, options);
                data.$element.data('jDialog',data);             
            }
            if (typeof option == 'string' && data && data[option])
                data[option]();
            else if(data.options.autoOpen)
                data.show();  
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
                    EmptyNotExistArray(obj,paraobj);
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
    /**
     * 没有提供的数组设置成[]
     * @param {object} Object object
     * @param {object} parameterObject parameter
     */
    var EmptyNotExistArray=function(object,parameterObject){
        for (var key in object) {
            if (object.hasOwnProperty(key) && $.isArray(object[key]) && !parameterObject.hasOwnProperty(key)) {
                object[key]=[];
            }
            else{
                if($.isPlainObject(object[key])){
                    EmptyNotExistArray(object[key],parameterObject[key]);
                }              
            }           
        }
    }
    var initOptions=function(_this){
        var options=_this.options;
        // var d=new Date();
        // var monthDay=("0" + (d.getMonth() + 1)).slice(-2)+("0" + (d.getDate())).slice(-2);
        // var DialogID=_this.currentDialogID.replace(/^.+_/g,"");
        // if(options.buttons.length>0){
        //     $.each(options.buttons,function(index,item){
        //         if(item.id==""){
        //             var r=Math.ceil(Math.random()*100);
        //             var id=DialogID+monthDay+index;
        //             item.id=id;
        //         }
        //     });
        // }
    }
    /**
     * 获取数组最大值
     * @param {Array} array 数组
     */
    var ArrayMax=function(array){
        var max = array[0];
        var len = array.length; 
        for (var i = 1; i < len; i++){ 
            if (array[i] > max) { 
                max = array[i]; 
            } 
        } 
        return max;
    }
    /**
     * 将指定字符串中的一个或多个格式项替换为指定对象的字符串表示形式
     * @param {string} formatStr 符合格式字符串
     * @returns {string}
     * @example
     * StringFormat("abc{0}e{1}fg",1,2) 输出 "abc1e2fg"
     */
    var StringFormat=function(formatStr){
        var args=arguments;
        return formatStr.replace(/\{(\d+)\}/g, function(m, i){
            i=parseInt(i);
            return args[i+1];
        });
    }
    var old = $.fn.jDialog;
    $.fn.jDialog = Plugin;
    $.fn.jDialog.Constructor = JDialog;
    $.fn.jDialog.noConflict = function () {
        $.fn.jDialog = old;
        return this;
    }
})(jQuery);
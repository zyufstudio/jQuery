/*
 * @Author: JohnnyLi 
 * @Date: 2019-07-01 17:24:54 
 * @Last Modified by: JohnnyLi
 * @Last Modified time: 2019-11-22 11:26:29
 */

/** 
 * 
*/
(function ($) {
    'use strict';
    var JBoxSelect = function (element, options) {
        this.$element = $(element);
        this.$head=$("html head");
        this.$body=$("html body");
        this.$doc=$(document);
        this.$selectBox={};
        this.options = $.extend({}, JBoxSelect.Defaults, options);
        this.init();
    }
    //配置参数
    JBoxSelect.Defaults = {
        selectedFn:function(selectedElm){},     //选中项回调函数，当选中每一项时触发该函数,selectedElm:当前选中的元素
        unselectFn:function(unselectedElm){}    //非选择项回调函数，已选中的项再次选择时触发该函数，unselectedElm:当前非选中的元素
    }
    JBoxSelect.prototype.init=function(){
        var _this=this;
        var opts=_this.options;
        var startX=0;
        var startY=0;
        var isdown=false;
        createStyle(_this);
        var $selectbox = $('<div class="select-box"></div>');
        _this.$body.append($selectbox);
        _this.$selectBox=$selectbox;
        
        _this.$element.on({
            "mousedown.JBoxSelect":function(e){
                isdown=true;
                startX = e.pageX;
                startY = e.pageY;
                _this.$selectBox.css({
                    left: startX,
                    top : startY
                });
                clearBubble(e);
            },
            "mousemove.JBoxSelect":function(e){
                if(isdown&&e.which===1){
                    var x = e.pageX;
                    var y = e.pageY;
                    resizeSelectBox(_this,startX,x,startY,y);
                    handleCrossEl(_this);
                    clearBubble(e);
                }
            },
            "mouseup.JBoxSelect":function(e){
                selectedEl(_this);
                isdown=false;
            }
        });
        _this.$doc.off("mouseup.JBoxSelect").on({
            "mouseup.JBoxSelect":function(e){
                selectedEl(_this);
                isdown=false;
            }
        });
    }
    var createStyle=function(_this){
        var s=".select-box {position: absolute;display: none;width: 0px;height: 0px;padding: 0px;margin: 0px;border: 1px dashed #0099ff;background-color: #c3d5ed;opacity: 0.5;filter: alpha(opacity=50);font-size: 0px;z-index: 99999;pointer-events: none;}";
        s="<style>"+s+"</style>";
        _this.$head.append(s);
    }
    /**
     * 拖拽选择框
     * @param {object} _this 
     * @param {number} startX 
     * @param {number} x 
     * @param {number} startY 
     * @param {number} y 
     */
    var resizeSelectBox=function(_this,startX,x,startY,y){
        _this.$selectBox.show();
        var _left   = Math.min(x, startX);
        var _top    = Math.min(y, startY);
        var _width  = Math.abs(x - startX);
        var _height = Math.abs(y - startY);
        _this.$selectBox.css({
            left  : _left,
            top   : _top,
            width : _width,
            height: _height
        });
    }
    /**
     * 获取元素的起始坐标和对角坐标
     * @param {object} $el 
     * @return {object} 元素的坐标
     */
    var getElCoord=function($el){
        var coords={};
        var x1 = $el.offset().left;
        var y1 = $el.offset().top;
        var x2 = x1 +$el.outerWidth();
        var y2 = y1+$el.outerHeight();
        coords.x1=x1;
        coords.y1=y1;
        coords.x2=x2;
        coords.y2=y2;
        return coords;
    }
    /**
     * 判断两个元素是否相交
     * @param {*} rect1 
     * @param {*} rect2 
     * @return {bool} true/false(相交/不相交)
     */
    var isCross=function(rect1,rect2){
        var xNotCross=true;
        var yNotCross = true;
        xNotCross =((rect1.x1>rect2.x2) || (rect2.x1>rect1.x2));
        yNotCross =  ((rect1.y1>rect2.y2) || (rect2.y1>rect1.y2));
        return !(xNotCross || yNotCross);
    }
    /**
     * 选中元素处理
     * @param {object} _this 
     */
    var handleCrossEl=function(_this){
        var opts=_this.options;
        var selectBoxCoord = getElCoord(_this.$selectBox);
        _this.$element.find('.select-item').each(function(){
            var $thisEl=$(this);
            var elCoord = getElCoord($thisEl);
            if(isCross(selectBoxCoord,elCoord)){
                //$thisEl.is(".select-item.selected-item") && $thisEl.removeClass('selected-item selecting-item').addClass("unselecting-item");
                //!$thisEl.is(".select-item.unselecting-item") && $thisEl.addClass('selecting-item');
                if($thisEl.is(".select-item.selected-item")){
                    $thisEl.removeClass('selected-item selecting-item').addClass("unselecting-item");
                    typeof opts.unselectFn=="function" && opts.unselectFn($thisEl[0]);
                }
                else if(!$thisEl.is(".select-item.unselecting-item")){
                    $thisEl.addClass('selecting-item');
                    typeof opts.selectedFn=="function" && opts.selectedFn($thisEl[0]);
                }
            }else{
                if($thisEl.is(".select-item.unselecting-item")){
                    $thisEl.addClass('selected-item').removeClass("unselecting-item");
                    typeof opts.selectedFn=="function" && opts.selectedFn($thisEl[0]);
                }
                else{
                    $thisEl.removeClass('selecting-item');                  
                }
            }
        });
    }
    /**
     * 设置选中元素状态
     * @param {object} _this 
     */
    var selectedEl=function(_this){
        var opts=_this.options;
        _this.$element.find('.select-item.selecting-item').removeClass('selecting-item').addClass('selected-item');
        _this.$element.find('.select-item.unselecting-item').removeClass('selecting-item selected-item unselecting-item');
        _this.$selectBox.hide();
        //var selectedEls=_this.$element.find(".select-item.selected-item");
        //var unselectedEls=_this.$element.find(".select-item:not(.selected-item)");
    }
    /**
     * 清除冒泡和捕获
     * @param {object} e 
     */
    var clearBubble=function (e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        } else {
            e.cancelBubble = true;
        }

        if (e.preventDefault) {
            e.preventDefault();
        } else {
            e.returnValue = false;
        }
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
    function Plugin(option) {
        return this.each(function () {
            var $this = $(this);
            var options = typeof option == 'object' && option;
            var data= $this.data('JBoxSelect');
            if (!data){
                data=new JBoxSelect(this, options);
                $this.data('JBoxSelect',data);               
            }
        });
    }
    var old = $.fn.JBoxSelect;
    $.fn.JBoxSelect = Plugin;
    $.fn.JBoxSelect.Constructor = JBoxSelect;
    $.fn.JBoxSelect.noConflict = function () {
        $.fn.JBoxSelect = old;
        return this;
    }
})(jQuery);
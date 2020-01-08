/*
 * @Author: johnny 
 * @Date: 2018-09-25 14:16:17 
 * @Last Modified by: JohnnyLi
 * @Last Modified time: 2020-01-08 16:15:23
 */

/**
 *
 * @调用方法
 * var jpage=$(selector).JPage(option, callback);
 * -此处callback是初始化调用，option里的callback是点击页码后调用
 * 
 * -- example --
 * var jpage=$(selector).JPage({
 *     ... // 配置参数
 *     callback: function(api) {
 *         console.log('点击页码调用该回调'); //切换页码时执行一次回调
 *     }
 * }, function(api){
 *     console.log('初始化'); //插件初始化时调用该方法，比如请求第一次接口来初始化分页配置
 * });
 */
;
// var jsPath=$("script").last().attr("src");
// var jsBasePath=jsPath.split("#")[0].split("?")[0].replace(/[^\\\/]+$/, '');
// var jpageCssPath=jsBasePath+"jPage.css";
// document.write("<link href="+jpageCssPath+" rel='stylesheet' type='text/css'/>");

(function (factory) {
    if (typeof define === "function" && (define.amd || define.cmd) && !jQuery) {
        // AMD或CMD
        define(["jquery"], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node/CommonJS
        module.exports = function (root, jQuery) {
            if (jQuery === undefined) {
                if (typeof window !== 'undefined') {
                    jQuery = require('jquery');
                } else {
                    jQuery = require('jquery')(root);
                }
            }
            factory(jQuery);
            return jQuery;
        };
    } else {
        //Browser globals
        factory(jQuery);
    }
}(function ($) {
    //配置参数
    var defaults = {
        totalData: 0,   //数据总条数
        pageSize: 0,    //每页显示的条数
        pageCount: 0,   //总页数,默认为0
        pageIndex: 1,   //当前第几页
        pageRange: 2,   //显示当前页左右两边的页数
        isHide: false,  //当前页数为0页或者1页时是否显示分页
        disableCls: 'disabled', //禁用样式
        activeCls: 'active',    //当前页选中状态
        /**组件样式
         * 使用方法：
         * className:'JPage JPage-sm JPage-theme-blue'  //蓝色小号
         * 大小:
         * JPage-sm     //小号
         * JPage-lg     //大号
         * 主题：
         * JPage-theme-green  //绿色
         * JPage-theme-blue   //蓝色
         * JPage-theme-red    //红色  
         */
        className:'',        //默认'JPage'样式(灰色中号)
        
        showPN: true,        //是否显示上一页和下一页
        autoHidePN: true,    //自动隐藏上一页和下一页(是否在当前显示为第一页或者最后一页时隐藏 '上一页'或者'下一页' 按钮)
        prevContent: '<',    //上一页内容
        nextContent: '>',    //下一页内容

        showHE: true,       //显示首页和末页
        homeContent: '',    //首页节点内容
        endContent: '',     //末页节点内容

        showJump: true,     //显示跳转页        
        showJumpBtn:true,   //显示跳转按钮
        jumpBtn: 'Go',      //跳转按钮文本

        showPageSize: false,     //显示分页大小
        maxPageSize:50,          //分页大小的最大值
        //minPageSize:0,           //分页大小的最小值
        pSizeLabel: '页大小',     //分页大小Label
        
        callback: function () {} //回调
    };

    var JPage = function (element, options) {
        if(parseInt(options.totalData)!=0&&parseInt(options.pageSize)!=0){
            options.pageCount=0;
        }
        else if((options.totalData==0||options.pageSize==0)&&options.pageCount!=0){
            options.totalData=0;
            options.pageSize=0;
        }
        //全局变量
        var opts = options, //配置
            $document = $(document),
            $obj = $(element); //容器
        
        opts.prevCls='prev'; //上一页class
        opts.nextCls='next'; //下一页class
        opts.jumpIptCls='jump-ipt'; //文本框内容
        opts.jumpBtnCls='jump-btn'; //跳转按钮
        opts.pSizeIptCls= 'psize-ipt'; //页大小样式

        var self = this;    //自身实例
        /**
         * 设置总页数
         * @param {number} page 页码
         * @return opts.pageCount 总页数配置
         */
        this.setPageCount = function (page) {
            opts.pageCount = page;
        };

        /**
         * 设置数据总条数
         * @param {number} totalData 数据总条数
         * @return opts.totalData 数据总条数配置
         */
        this.setTotalData = function (totalData) {
            opts.totalData = totalData;
        };
        
        /**
         * 设置每页显示的条数
         * @param {number} pageSize 每页显示的条数
         * @return opts.pageSize 每页显示的条数配置
         */
        this.setPageSize = function (pageSize) {
            opts.pageSize = pageSize;
        };
        /**
         * 设置当前页码
         * @param {number} pageIndex 页码
         */
        this.setPageIndex=function(pageIndex){
            opts.pageIndex=pageIndex;
        }
        /**
         * 获取每页显示的条数
         * @return {number} 每页显示的条数
         */
        this.getPageSize = function () {
            return opts.pageSize;
        };

        /**
         * 获取总页数
         * 如果配置了总条数和每页显示条数，将会自动计算总页数并略过总页数配置，反之
         * @return {number} 总页数
         */
        this.getPageCount = function () {
            return opts.totalData && opts.pageSize ? Math.ceil(parseInt(opts.totalData) / opts.pageSize) : opts.pageCount;
        };

        /**
         * 获取当前页码
         * @return {number} 当前页码
         */
        this.getPageIndex = function () {
            return opts.pageIndex;
        };
        /**
         * 刷新分页
         * @param {number} pageIndex 页码
         * @param {number} pageSize 每页显示的条数
         * @param {number} totalData 数据总条数
         */
        this.refresh=function(pageIndex,pageSize,totalData){
            self.setPageIndex(pageIndex);
            self.setPageSize(pageSize);
            self.setTotalData(totalData);
            self.init();
        }
        //开始页码和结束页码，控制生成页码的数量
        var getPages=function(){
            var startPage = 1;
            var endPage = 10;
            var pagesObj = {};
            var totalPage = self.getPageCount();
            var pageIndex = opts.pageIndex;
            var pageSize = opts.pageSize;
            var pageRange = opts.pageRange;
    
            startPage = pageIndex - pageRange;
            endPage = pageIndex + pageRange;
            //如果最后一页大于总页数，取最后pageRange*2页
            if (endPage > totalPage) {
                endPage = totalPage;
                startPage = totalPage - pageRange * 2;
                startPage = startPage < 1 ? 1 : startPage;
            }
    
            //如果开始页小于1，取开始pageRange*2+1页
            if (startPage <= 1) {
                startPage = 1;
                endPage = Math.min(pageRange * 2 + 1, totalPage);
            }

            pagesObj.startPage = startPage;
            pagesObj.endPage = endPage;
            return pagesObj;
         }
        /**
        * 填充数据
        */
         var filling=function(){
            var el_class=$obj.attr("class");
            var className=!el_class&&opts.className==''?'JPage':opts.className!=''?opts.className:el_class;
            var pageCount = self.getPageCount(); //获取的总页数
            var pagesObj = getPages(); //获取首尾页码
            pageIndex = parseInt(opts.pageIndex); //当前页码
            
            var html = '<div class="'+className+'"><div class="pagesBox"><ul id="pager">';
            if (opts.showPN) { //上一页
                if (pageIndex <= 1) {
                  if (!opts.autoHidePN) {
                    html += '<li class="' + opts.disableCls + '"><a href="javascript:;">' + opts.prevContent + '</a></li>';
                  }
                } else {
                    html += '<li class="' + opts.prevCls + '"><a href="javascript:;">' + opts.prevContent + '</a></li>';
                }
            }
            if (pagesObj.startPage <= 3) {
                for (var i =1; i < pagesObj.startPage; i++) {
                    if (i == pageIndex) {
                        html+='<li class='+opts.activeCls+'><span>' + i + '</span></li>';
                    }
                    else {
                        html+='<li><a href="javascript:;" data-page="'+i+'">' + i + '</a></li>';
                    }
                }
            }
            else {
                if (opts.showHE) {  //首页
                    var home =opts.homeContent ? opts.homeContent : '1';
                    html += '<li><a href="javascript:;" data-page="1">' + home + '</a></li>';
                }
                html+='<li class="ellips"><span>...</span></li>';
            }
            for (var i = pagesObj.startPage; i <= pagesObj.endPage; i++) {
                if(i==pageIndex){
                    html+='<li class='+opts.activeCls+'><span>' + i + '</span></li>';
                }
                else{
                    html+='<li><a href="javascript:;" data-page="'+i+'">' + i + '</a></li>';
                }
            }
            if(pagesObj.endPage>= pageCount-2){
                for(var i=pagesObj.endPage+1;i<=pageCount;i++){
                    html+='<li><a href="javascript:;" data-page="'+i+'">' + i + '</a></li>';
                } 
            }
            else {
                html += '<li class="ellips"><span>...</span></li>';
                if (opts.showHE) {  //末页
                    var end = opts.endContent ? opts.endContent : pageCount;
                    html += '<li><a href="javascript:;" data-page="' + pageCount + '">' + end + '</a></li>';
                }
            }
            if (opts.showPN) {  //下一页
                if (pageIndex >= pageCount) {
                    if (!opts.autoHidePN) {
                        html += '<li class="' + opts.disableCls + '"><a href="javascript:;">' + opts.nextContent + '</a></li>';
                    }
                } else {
                    html += '<li class="' + opts.nextCls + '"><a href="javascript:;">' + opts.nextContent + '</a></li>';
                }
            }
            html+="</ul></div>";
            if (opts.showPageSize&&opts.pageSize!=0) {    //分页大小
                html += '<div class="pSizeBox"><div><label>' + opts.pSizeLabel + ': </label><input title="请按回车跳转" type="text" class="' + opts.pSizeIptCls + '"value="' + opts.pageSize + '"></div></div>';
            }
            if (opts.showJump) {  //跳转
                html += '<div class="jumpBox"><div><label>到第&nbsp;</label><input title="请按回车跳转" type="text" class="' + opts.jumpIptCls + '"/><label>&nbsp;页</label>';
                if (opts.showJumpBtn) {
                    html += '<button class="' + opts.jumpBtnCls + '">' + opts.jumpBtn + '</button></div></div>';
                }
                else{
                    html+='</div></div>';
                }
            }
            html+='</div>';    
            $obj.empty().html(html);
         }

        //绑定事件
        var eventBind = function () {
            var index = 1;
            $obj.off().on('click', 'li', function () {
                if ($(this).hasClass(opts.activeCls)||$(this).hasClass(opts.disableCls)||$(this).hasClass("ellips")){
                    return false;
                }
                else if ($(this).hasClass(opts.nextCls)) {
                    if ($obj.find('li.' + opts.activeCls).text() >= self.getPageCount()) {;
                        //$(this).addClass('disabled');
                        return false;
                    } else {
                        index = parseInt($obj.find('li.' + opts.activeCls).text()) + 1;
                    }
                } else if ($(this).hasClass(opts.prevCls)) {
                    if ($obj.find('li.' + opts.activeCls).text() <= 1) {
                       // $(this).addClass('disabled');
                        return false;
                    } else {
                        index = parseInt($obj.find('li.' + opts.activeCls).text()) - 1;
                    }
                } else {
                    index = parseInt($(this.firstChild).data('page'));
                }
                opts.pageIndex = index;
                filling();
                typeof opts.callback === 'function' && opts.callback(self);
            });
            //跳转页按钮
            $obj.on('click', 'button.'+opts.jumpBtnCls, function () {
                if ($(this).hasClass(opts.jumpBtnCls)) {
                    if ($obj.find('.' + opts.jumpIptCls).val() !== '') {
                        index = parseInt($obj.find('.' + opts.jumpIptCls).val());
                        opts.pageIndex = index;
                        filling();
                        typeof opts.callback === 'function' && opts.callback(self);
                    } else {
                        return;
                    }
                }
            });
            //输入页码
            $obj.on('input propertychange', function (event) {
                var eventElement = event.srcElement ? event.srcElement : event.target;
                var $eventElement=$(eventElement);
                var $this = $(this);
                var val = $eventElement.val();
                var reg = /[^\d]/g;
                if (reg.test(val)) $eventElement.val(val.replace(reg, ''));
                if($eventElement.hasClass(opts.jumpIptCls)){    //跳转页
                    (parseInt(val) > self.getPageCount()) && $eventElement.val(self.getPageCount()) ;
                    if (parseInt(val) === 0) 
                        $eventElement.val(1); //最小值为1
                }
                else if($eventElement.hasClass(opts.pSizeIptCls)){  //分页大小
                    (parseInt(val) > opts.totalData) && $eventElement.val( opts.totalData) ;
                    (parseInt(val) > opts.maxPageSize) && $eventElement.val( opts.maxPageSize) ;
                    //(parseInt(val) < opts.minPageSize) && $eventElement.val( opts.minPageSize) ;
                    if (parseInt(val) === 0) 
                        $eventElement.val(1); //最小值为1                      
                }
            });
            
            $document.off("keydown").keydown(function (e) {
                if (e.keyCode == 13){
                    eElement = e.srcElement ? e.srcElement : e.target;
                    if($(eElement).val()=='') return;
                    var clsName= $(eElement).attr("class");
                    switch(clsName){
                        case opts.jumpIptCls:
                            var index = parseInt($(eElement).val());
                            opts.pageIndex = index;
                            filling();
                            typeof opts.callback === 'function' && opts.callback(self);
                            break;
                        case opts.pSizeIptCls:
                            var pageSize = parseInt($(eElement).val());
                            opts.pageSize = pageSize;
                            opts.pageIndex = 1;
                            filling();
                            typeof opts.callback === 'function' && opts.callback(self);
                            break;
                        default:
                    }
                }
            });
        };

        //初始化
        this.init = function () {
            filling();
            eventBind();
            if (opts.isHide && this.getPageCount() == '1' || this.getPageCount() == '0') {
                $obj.hide();
            } else {
                $obj.show();
            }
        };
        this.init();
    };
    $.fn.jPage = function (parameter, callback) {
        if (typeof parameter == 'function') { //重载
            callback = parameter;
            parameter = {};
        } else {
            parameter = parameter || {};
            callback = callback || function () {};
        }
        var options = $.extend({}, defaults, parameter);
        var jpage={};
        this.each(function () {
            jpage = new JPage(this, options);
            callback(jpage);
            jpage.init();
        });
        return jpage;   //返回当前Object
    };
}));
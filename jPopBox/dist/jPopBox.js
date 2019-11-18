(function($) {
	var tips = [];
	function handleWindowResize() {
		$.each(tips, function() {
			this.refresh(true);
		});
	}
	$(window).resize(handleWindowResize);

	$.JPopBox = function(elm, options) {
		this.$elm = $(elm);
        this.opts = this.getOptions(options);
        var popBoxHtml=[];
        popBoxHtml.push('<div class="'+this.opts.className+'">');
        if(this.opts.title!=""){
            popBoxHtml.push('<div class="tip-title">'+this.opts.title+'</div>');
        }
        if(this.opts.isShowArrow){
            popBoxHtml.push('<div class="tip-arrow tip-arrow-top tip-arrow-right tip-arrow-bottom tip-arrow-left" style="visibility:inherit"></div>');
        }
        popBoxHtml.push('<div class="tip-content"></div>'),
        popBoxHtml.push('</div>');
        this.$tip = $(popBoxHtml.join('')).appendTo(document.body);
		this.$arrow = this.$tip.find('div.tip-arrow');
        this.$inner = this.$tip.find('div.tip-content');
        this.disabled = false;
		this.content = null;
		this.init();
	};

	$.JPopBox.hideAll = function() {
		$.each(tips, function() {
			this.hide();
		});
	};

	$.JPopBox.prototype = {
        getOptions:function(options){
            options = $.extend({}, $.fn.jPopBox.defaults, options);
            if (options.delay && typeof options.delay == 'number') {
                options.delay = {
                    show: options.delay,
                    hide: options.delay
                }
            }
            if (typeof options.offset == 'number') {
                options.offset = {
                    X: options.offset,
                    Y: options.offset
                }
            }
            return options
        },
		init: function() {
			tips.push(this);
			this.$elm.data('jPopBox', this);
			if (this.opts.trigger != 'none') {
				this.opts.trigger!="click" && this.$elm.on({
					'mouseenter.jPopBox': $.proxy(this.mouseenter, this),
					'mouseleave.jPopBox': $.proxy(this.mouseleave, this)
				});
				switch (this.opts.trigger) {
                    case 'click':
                        this.$elm.on('click.jPopBox', $.proxy(this.toggle, this));
                        break;
                    case 'hover':
                        if (this.opts.isTipHover)
							this.$tip.hover($.proxy(this.clearTimeouts, this), $.proxy(this.mouseleave, this));
						break;
					case 'focus':
						this.$elm.on({
							'focus.jPopBox': $.proxy(this.showDelayed, this),
							'blur.jPopBox': $.proxy(this.hideDelayed, this)
						});
						break;
				}
			}
        },
        toggle:function(){
            var active=this.$tip.data('active');
            if(!active)
                this.showDelayed();
            else 
                this.hideDelayed();
        },
		mouseenter: function(e) {
			if (this.disabled)
				return true;
			this.updateCursorPos(e);
			this.$elm.attr('title', '');
			if (this.opts.trigger == 'focus')
				return true;
			this.showDelayed();
		},
		mouseleave: function(e) {
			if (this.disabled || this.asyncAnimating && (this.$tip[0] === e.relatedTarget || jQuery.contains(this.$tip[0], e.relatedTarget)))
				return true;
			if (this.opts.trigger == 'focus')
				return true;
			this.hideDelayed();
		},
		mousemove: function(e) {
			if (this.disabled)
				return true;
			this.updateCursorPos(e);
			if (this.opts.isFollowCursor && this.$tip.data('active')) {
				this.calcPos();
				this.$tip.css({left: this.pos.l, top: this.pos.t});
			}
		},
		show: function() {
			if (this.disabled || this.$tip.data('active'))
				return;
			this.reset();
			this.update();
			if (!this.content)
				return;
			this.display();
		},
		showDelayed: function() {
			this.clearTimeouts();
			this.showTimeout = setTimeout($.proxy(this.show, this), this.opts.delay.show);
		},
		hide: function() {
			if (this.disabled || !this.$tip.data('active'))
				return;
			this.display(true);
		},
		hideDelayed: function() {
			this.clearTimeouts();
			this.hideTimeout = setTimeout($.proxy(this.hide, this),this.opts.delay.hide);
		},
		reset: function() {
			this.$tip.queue([]).detach().css('visibility', 'hidden').data('active', false);
			this.$inner.find('*').jPopBox('hide');
			this.$arrow.length && (this.$arrow[0].className = 'tip-arrow tip-arrow-top tip-arrow-right tip-arrow-bottom tip-arrow-left');
			this.asyncAnimating = false;
		},
		update: function(content, dontOverwriteOption) {
			if (this.disabled)
				return;

			var async = content !== undefined;
			if (async) {
				if (!dontOverwriteOption)
					this.opts.content = content;
				if (!this.$tip.data('active'))
					return;
			} else {
				content = this.opts.content;
			}

			// update content only if it has been changed since last time
			var self = this,
				newContent = typeof content == 'function' ?
					content.call(this.$elm[0], function(newContent) {
						self.update(newContent);
					}) : content;
			if (this.content !== newContent) {
				this.$inner.empty().append(newContent);
				this.content = newContent;
			}
			this.refresh(async);
		},
		refresh: function(async) {
			if (this.disabled)
				return;
			if (async) {
				if (!this.$tip.data('active'))
					return;
			}
			this.$tip.css({left: 0, top: 0}).appendTo(document.body);
			if (this.opacity === undefined)
                this.opacity = this.$tip.css('opacity');             
            this.calcPos();
            this.$tip.css({left: this.pos.l, top: this.pos.t});
		},
		display: function(hide) {
			var active = this.$tip.data('active');
			if (active && !hide || !active && hide)
				return;

			this.$tip.stop();
            var from = {}, to = {};
            from.opacity = hide ? this.$tip.css('opacity') : 0;
			to.opacity = hide ? 0 : this.opacity;
            this.$tip.css(from).animate(to, 300);

			hide ? this.$tip.queue($.proxy(this.reset, this)) : this.$tip.css('visibility', 'inherit');
			this.$tip.data('active', !active);
		},
		disable: function() {
			this.reset();
			this.disabled = true;
		},
		enable: function() {
			this.disabled = false;
		},
		destroy: function() {
			this.reset();
			this.$tip.remove();
			delete this.$tip;
			this.content = null;
			this.$elm.off('.jPopBox').removeData('jPopBox');
			tips.splice($.inArray(this, tips), 1);
		},
		clearTimeouts: function() {
			if (this.showTimeout) {
				clearTimeout(this.showTimeout);
				this.showTimeout = 0;
			}
			if (this.hideTimeout) {
				clearTimeout(this.hideTimeout);
				this.hideTimeout = 0;
			}
		},
		updateCursorPos: function(e) {
			this.eventX = e.pageX;
			this.eventY = e.pageY;
		},
		calcPos: function() {
            this.tipOuterW = this.$tip.outerWidth();
            this.tipOuterH = this.$tip.outerHeight();
			var pos = {l: 0, t: 0, arrow: ''},
				$win = $(window),
				win = {
					l: $win.scrollLeft(),
					t: $win.scrollTop(),
					w: $win.width(),
					h: $win.height()
				}, xL, xC, xR, yT, yC, yB,arrowOuterWH,placement,isAuto=false,keepInViewport=true;
            var elmOffset = this.$elm.offset(),
                elm = {
                    l: elmOffset.left,
                    t: elmOffset.top,
                    w: this.$elm.outerWidth(),
                    h: this.$elm.outerHeight()
                };
            xL = elm.l;	        // left
            xC = xL + Math.floor(elm.w / 2);    // h center
            xR = xL + elm.w;    // right
            yT = elm.t;	        // top
            yC = yT + Math.floor(elm.h / 2);    // v center
            yB = yT +elm.h;	    // bottom
            placement=this.opts.placement;
            var autoReg=/\s?auto?\s?/i;
            isAuto=autoReg.test(placement);
            if (isAuto) placement = placement.replace(autoReg, '') || 'top'
            //calc left position
			switch (placement) {
                case "top":
                case "bottom":
                    pos.l = xC - Math.floor(this.tipOuterW / 2)-this.opts.offset.X;
                    if (keepInViewport) {
                        if (pos.l + this.tipOuterW > win.l + win.w)
                            pos.l = win.l + win.w - this.tipOuterW;
                        else if (pos.l < win.l)
                            pos.l = win.l;
                    }
                    break;
                case "right":
                    arrowOuterWH=this.setArrowAndGetWH(placement);
					pos.l = xR + this.opts.offset.X+arrowOuterWH.W;
                    if (isAuto && pos.l + this.tipOuterW > win.l + win.w){
                        arrowOuterWH=this.setArrowAndGetWH("left");  
                        pos.l =xL - this.tipOuterW - this.opts.offset.X-arrowOuterWH.W;
                    }              
                    break;
                case "left":
                    arrowOuterWH=this.setArrowAndGetWH(placement);
                    pos.l = xL - this.tipOuterW- this.opts.offset.X-arrowOuterWH.W;
                    if (isAuto && pos.l < win.l){
                        arrowOuterWH=this.setArrowAndGetWH("right");
                        pos.l =xR + this.opts.offset.X+arrowOuterWH.W;
                    }
                    break;
				case 'center':
					break;
                default:
                    break;
            }
            //calc top position
            switch (placement) {
                case "top":
                    arrowOuterWH=this.setArrowAndGetWH(placement);
                    pos.t = yT - this.tipOuterH - this.opts.offset.Y-arrowOuterWH.H;
                    if (isAuto && pos.t < win.t) {
                        arrowOuterWH=this.setArrowAndGetWH("bottom");
                        pos.t = yB + this.opts.offset.Y+arrowOuterWH.H;
                    }
                    break;
                case "bottom":
                    arrowOuterWH=this.setArrowAndGetWH(placement);
                    pos.t = yB+ this.opts.offset.Y +arrowOuterWH.H;
                    if (isAuto && pos.t + this.tipOuterH > win.t + win.h) {
                        arrowOuterWH=this.setArrowAndGetWH("top");
                        pos.t = yT - this.tipOuterH - this.opts.offset.Y-arrowOuterWH.H;
                    }
                    break;
				case "right":
                case "left":
                    pos.t = yC - Math.floor(this.tipOuterH / 2)-this.opts.offset.Y;
                    if (keepInViewport) {
                        if (pos.t + this.tipOuterH > win.t + win.h){
                            pos.t = win.t + win.h - this.tipOuterH;                
                        }
                        else if (pos.t < win.t)
                            pos.t = win.t; 
                    }
                    break;
				case 'center':
					break;
                default:
                    break;
            }
			this.pos = pos;
        },
        setArrowAndGetWH:function(placement){
            var arrowOuteWH={};
            var W=0,H=0;
            if(this.$arrow.length){
                this.$arrow.attr("class", "tip-arrow tip-arrow-" + placement);
                W = this.$arrow.outerWidth();
                H = this.$arrow.outerHeight();
            }
            arrowOuteWH.W=W;
            arrowOuteWH.H=H;
            return arrowOuteWH;
        }
	};
	$.fn.jPopBox = function(options) {
		if (typeof options == 'string') {
			var args = arguments,
				method = options;
			Array.prototype.shift.call(args);
			if (method == 'destroy') {
				this.die ?
					this.die('mouseenter.jPopBox').die('focus.jPopBox') :
					$(document).undelegate(this.selector, 'mouseenter.jPopBox').undelegate(this.selector, 'focus.jPopBox');
			}
			return this.each(function() {
				var jPopBox = $(this).data('jPopBox');
				if (jPopBox && jPopBox[method])
					jPopBox[method].apply(jPopBox, args);
			});
		}

		var opts = $.extend({}, $.fn.jPopBox.defaults, options);
		if (!$('#jPopBox-css-' + opts.className)[0])
			$(['<style id="jPopBox-css-',opts.className,'" type="text/css">',
				'div.',opts.className,'{visibility:hidden;position:absolute;top:0;left:0;}',
				'div.',opts.className,' div.tip-arrow{visibility:hidden;position:absolute;font:1px/1px sans-serif;}',
			'</style>'].join('')).appendTo('head');
    
		return this.each(function() {
			new $.JPopBox(this, opts);
		});
	}

	// default settings
	$.fn.jPopBox.defaults = {
        title:'',                   // 标题
		content:'',	                // 弹出框内容 ('string', element, function(updateCallback){...})
        className:'tip-white',	    // class名称
        placement:'top',            // 如何定位弹出框 (top|bottom|left|right|auto)。当指定为 auto 时，会动态调整弹出框。例如，如果 placement 是 "auto left"，弹出框将会尽可能显示在左边，在情况不允许的情况下它才会显示在右边
        delay:100,                  // 延迟显示和隐藏弹出框的毫秒数,对 trigger:none 手动触发类型不适用。如果提供的是一个数字，那么延迟将会应用于显示和隐藏。如果提供的是一个对象{ show: 500, hide: 100 }，那么延迟将会分别应用于显示和隐藏
		trigger:'hover',	        // 如何触发弹出框 ('click',hover', 'focus', 'none'),none为手动触发
        offset:0,                   // 方向偏移量，值为负数时，将会反向偏移。如果提供的是一个数字，那么偏移量将会应用于X轴和Y轴。如果提供的是一个对象{ X:200, Y: 100 }，那么偏移量将会分别应用于X轴和Y轴
        isShowArrow:true,           // 是否显示指向箭头
        isTipHover:true             // 是否允许在弹出框上移动，而不自动隐藏。只对trigger:hover有效。
	};
})(jQuery);
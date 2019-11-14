(function($) {

	var tips = [],
		reBgImage = /^url\(["']?([^"'\)]*)["']?\);?$/i,
		rePNG = /\.png$/i,
		IE = !!window.createPopup,
 		IE6 = IE && typeof document.documentElement.currentStyle.minWidth == 'undefined',
		IElt9 = IE && !document.defaultView;

	// make sure the tips' position is updated on resize
	function handleWindowResize() {
		$.each(tips, function() {
			this.refresh(true);
		});
	}
	$(window).resize(handleWindowResize);

	$.JPopBox = function(elm, options) {
		this.$elm = $(elm);
		this.opts = this.getOptions(options);
        var title="";
        if(this.opts.title!=""){
            title='<div class="tip-title">'+this.opts.title+'</div>';
        }
        this.$tip = $(['<div class="',this.opts.className,'">',
                title,
				'<div class="tip-inner tip-bg-image"></div>',
				'<div class="tip-arrow tip-arrow-top tip-arrow-right tip-arrow-bottom tip-arrow-left" style="visibility:inherit"></div>',
			'</div>'].join('')).appendTo(document.body);
		this.$arrow = this.$tip.find('div.tip-arrow');
        this.$inner = this.$tip.find('div.tip-inner');
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
            if (options.delay>-1 && typeof options.delay == 'number') {
                options.delay = {
                    show: options.delay,
                    hide: options.delay
                }
            }
            if (options.offset>-1 && typeof options.offset == 'number') {
                options.offset = {
                    X: options.offset,
                    Y: options.offset
                }
            }
            return options
        },
		init: function() {
			tips.push(this);
			var title = this.$elm.attr('title');
			this.$elm.data('title.jPopBox', title !== undefined ? title : null)
				.data('jPopBox', this);
			if (this.opts.trigger != 'none') {
				this.$elm.bind({
					'mouseenter.jPopBox': $.proxy(this.mouseenter, this),
					'mouseleave.jPopBox': $.proxy(this.mouseleave, this)
				});
				switch (this.opts.trigger) {
					case 'hover':
						if (this.opts.alignTo == 'cursor')
							this.$elm.bind('mousemove.jPopBox', $.proxy(this.mousemove, this));
						if (this.opts.isTipHover)
							this.$tip.hover($.proxy(this.clearTimeouts, this), $.proxy(this.mouseleave, this));
						break;
					case 'focus':
						this.$elm.bind({
							'focus.jPopBox': $.proxy(this.showDelayed, this),
							'blur.jPopBox': $.proxy(this.hideDelayed, this)
						});
						break;
				}
			}
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
			if (!this.$tip.data('active')) {
				var title = this.$elm.data('title.jPopBox');
				if (title !== null)
					this.$elm.attr('title', title);
			}
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
				if (this.pos.arrow)
					this.$arrow[0].className = 'tip-arrow tip-arrow-' + this.opts.placement;
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
			this.$arrow[0].className = 'tip-arrow tip-arrow-top tip-arrow-right tip-arrow-bottom tip-arrow-left';
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
					}) :
					content == "" ? this.$elm.data('title.jPopBox') : content;
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
			if (active) {
				var title = this.$elm.data('title.jPopBox');
				if (title !== null)
					this.$elm.attr('title', title);
			}
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
			this.$elm.unbind('.jPopBox').removeData('title.jPopBox').removeData('jPopBox');
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
			if (this.opts.alignTo == 'cursor') {
				xL = xC = xR = this.eventX;
				yT = yC = yB = this.eventY;
			} else { // this.opts.alignTo == 'target'
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
            }
            placement=this.opts.placement;
            var autoReg=/\s?auto?\s?/i;
            isAuto=autoReg.test(placement);
            if (isAuto) placement = placement.replace(autoReg, '') || 'top'
            //calc left position
			switch (placement) {
                case "top":
                case "bottom":
                    pos.l = xC - Math.floor(this.tipOuterW / 2);
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
                    pos.t = yC - Math.floor(this.tipOuterH / 2);
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
            this.$arrow.attr("class", "tip-arrow tip-arrow-" + placement);
            W = this.$arrow.outerWidth();
            H = this.$arrow.outerHeight();
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
				'div.',opts.className,' table.tip-table, div.',opts.className,' table.tip-table td{margin:0;font-family:inherit;font-size:inherit;font-weight:inherit;font-style:inherit;font-variant:inherit;vertical-align:middle;}',
				'div.',opts.className,' td.tip-bg-image span{display:block;font:1px/1px sans-serif;overflow:hidden;}',
				'div.',opts.className,' td.tip-right{background-position:100% 0;}',
				'div.',opts.className,' td.tip-bottom{background-position:100% 100%;}',
				'div.',opts.className,' td.tip-left{background-position:0 100%;}',
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
        delay:100,                  // 延迟显示和隐藏弹出框的毫秒数,对 trigger:none 手动触发类型不适用。如果提供的是一个数字，那么延迟将会应用于显示和隐藏。如果提供的是一个对象{ show: 500, hide: 100 }，那么延迟将会分别应用于显示和隐藏
		trigger:'hover',	        // 如何触发弹出框 ('hover', 'focus', 'none'),none为手动触发
		alignTo:'cursor',	        // 弹出框位置对齐('cursor', 'target')
        offset:0,                   // 方向偏移量，如果提供的是一个数字，那么偏移量将会应用于X轴和Y轴。如果提供的是一个对象{ X:200, Y: 100 }，那么偏移量将会分别应用于X轴和Y轴
		isTipHover:true,		    // allow hovering the tip without hiding it onmouseout of the target - matters only if trigger:'hover'
		isFollowCursor:false,		// 弹出框是否跟随鼠标，只对 trigger:'hover' 并且 alignTo:'cursor' 生效
        placement:'top'             // 如何定位弹出框
	};
})(jQuery);
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
		this.opts = $.extend({}, $.fn.jPopBox.defaults, options);
        var idNameHtml = (('' != this.opts.idName) ? ('id='+this.opts.idName) : '');
        var title="";
        if(this.opts.title!=""){
            title='<div class="tip-title">'+this.opts.title+'</div>';
        }
        this.$tip = $(['<div ', idNameHtml,' class="',this.opts.className,'">',
                title,
				'<div class="tip-inner tip-bg-image"></div>',
				'<div class="tip-arrow tip-arrow-top tip-arrow-right tip-arrow-bottom tip-arrow-left"></div>',
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
		init: function() {
			tips.push(this);

			// save the original title and a reference to the JPopBox object
			var title = this.$elm.attr('title');
			this.$elm.data('title.jPopBox', title !== undefined ? title : null)
				.data('jPopBox', this);

			// hook element events
			if (this.opts.showOn != 'none') {
				this.$elm.bind({
					'mouseenter.jPopBox': $.proxy(this.mouseenter, this),
					'mouseleave.jPopBox': $.proxy(this.mouseleave, this)
				});
				switch (this.opts.showOn) {
					case 'hover':
						if (this.opts.alignTo == 'cursor')
							this.$elm.bind('mousemove.jPopBox', $.proxy(this.mousemove, this));
						if (this.opts.allowTipHover)
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
			if (this.opts.showOn == 'focus')
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
			if (this.opts.showOn == 'focus')
				return true;

			this.hideDelayed();
		},
		mousemove: function(e) {
			if (this.disabled)
				return true;

			this.updateCursorPos(e);

			if (this.opts.followCursor && this.$tip.data('active')) {
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

			// don't proceed if we didn't get any content in update() (e.g. the element has an empty title attribute)
			if (!this.content)
				return;

			this.display();
			if (this.opts.timeOnScreen)
				this.hideDelayed(this.opts.timeOnScreen);
		},
		showDelayed: function(timeout) {
			this.clearTimeouts();
			this.showTimeout = setTimeout($.proxy(this.show, this), typeof timeout == 'number' ? timeout : this.opts.showTimeout);
		},
		hide: function() {
			if (this.disabled || !this.$tip.data('active'))
				return;

			this.display(true);
		},
		hideDelayed: function(timeout) {
			this.clearTimeouts();
			this.hideTimeout = setTimeout($.proxy(this.hide, this), typeof timeout == 'number' ? timeout : this.opts.hideTimeout);
		},
		reset: function() {
			this.$tip.queue([]).detach().css('visibility', 'hidden').data('active', false);
			this.$inner.find('*').jPopBox('hide');
			if (this.opts.fade)
				this.$tip.css('opacity', this.opacity);
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
					content == '[title]' ? this.$elm.data('title.jPopBox') : content;
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
				// save current position as we will need to animate
				var currPos = {left: this.$tip.css('left'), top: this.$tip.css('top')};
			}

			// reset position to avoid text wrapping, etc.
			this.$tip.css({left: 0, top: 0}).appendTo(document.body);

			// save default opacity
			if (this.opacity === undefined)
				this.opacity = this.$tip.css('opacity');

			// check for images - this code is here (i.e. executed each time we show the tip and not on init) due to some browser inconsistencies
			var bgImage = this.$tip.css('background-image').match(reBgImage),
				arrow = true;//this.$arrow.css('background-image').match(reBgImage);

			if (bgImage) {
				var bgImagePNG = rePNG.test(bgImage[1]);
				// fallback to background-color/padding/border in IE6 if a PNG is used
				if (IE6 && bgImagePNG) {
					this.$tip.css('background-image', 'none');
					this.$inner.css({margin: 0, border: 0, padding: 0});
					bgImage = bgImagePNG = false;
				} else {
					this.$tip.prepend('<table class="tip-table" border="0" cellpadding="0" cellspacing="0"><tr><td class="tip-top tip-bg-image" colspan="2"><span></span></td><td class="tip-right tip-bg-image" rowspan="2"><span></span></td></tr><tr><td class="tip-left tip-bg-image" rowspan="2"><span></span></td><td></td></tr><tr><td class="tip-bottom tip-bg-image" colspan="2"><span></span></td></tr></table>')
						.css({border: 0, padding: 0, 'background-image': 'none', 'background-color': 'transparent'})
						.find('.tip-bg-image').css('background-image', 'url("' + bgImage[1] +'")').end()
						.find('td').eq(3).append(this.$inner);
				}
				// disable fade effect in IE due to Alpha filter + translucent PNG issue
				if (bgImagePNG && IElt9)
					this.opts.fade = false;
			}
			// IE arrow fixes
			if (arrow && IElt9) {
				// disable arrow in IE6 if using a PNG
				if (IE6 && rePNG.test(arrow[1])) {
					arrow = false;
					this.$arrow.css('background-image', 'none');
				}
				// disable fade effect in IE due to Alpha filter + translucent PNG issue
				this.opts.fade = false;
			}

			var $table = this.$tip.find('> table.tip-table');
			if (IE6) {
				// fix min/max-width in IE6
				this.$tip[0].style.width = '';
				$table.width('auto').find('td').eq(3).width('auto');
				var tipW = this.$tip.width(),
					minW = parseInt(this.$tip.css('min-width')),
					maxW = parseInt(this.$tip.css('max-width'));
				if (!isNaN(minW) && tipW < minW)
					tipW = minW;
				else if (!isNaN(maxW) && tipW > maxW)
					tipW = maxW;
				this.$tip.add($table).width(tipW).eq(0).find('td').eq(3).width('100%');
			} else if ($table[0]) {
				// fix the table width if we are using a background image
				// IE9, FF4 use float numbers for width/height so use getComputedStyle for them to avoid text wrapping
				// for details look at: http://vadikom.com/dailies/offsetwidth-offsetheight-useless-in-ie9-firefox4/
				$table.width('auto').find('td').eq(3).width('auto').end().end().width(document.defaultView && document.defaultView.getComputedStyle && parseFloat(document.defaultView.getComputedStyle(this.$tip[0], null).width) || this.$tip.width()).find('td').eq(3).width('100%');
			}

			// position and show the arrow image
			if (arrow) {
				this.$arrow.css('visibility', 'inherit');
			}
			this.tipOuterW = this.$tip.outerWidth();
            this.tipOuterH = this.$tip.outerHeight();
            this.calcPos();
            
			if (async && this.opts.refreshAniDuration) {
				this.asyncAnimating = true;
				var self = this;
                this.$tip.css(currPos).animate({left: this.pos.l, top: this.pos.t}, this.opts.refreshAniDuration, function() { self.asyncAnimating = false; });
                //this.$tip.css(currPos).animate({left: 100, top: 100}, this.opts.refreshAniDuration, function() { self.asyncAnimating = false; });
			} else {
                this.$tip.css({left: this.pos.l, top: this.pos.t});
                //this.$tip.css({left: 100, top: 100});
			}
		},
		display: function(hide) {
			var active = this.$tip.data('active');
			if (active && !hide || !active && hide)
				return;

			this.$tip.stop();
			if ((this.opts.slide && this.pos.arrow || this.opts.fade) && (hide && this.opts.hideAniDuration || !hide && this.opts.showAniDuration)) {
				var from = {}, to = {};
				// this.pos.arrow is only undefined when alignX == alignY == 'center' and we don't need to slide in that rare case
				if (this.opts.slide && this.pos.arrow) {
					var prop, arr;
					if (this.pos.arrow == 'bottom' || this.pos.arrow == 'top') {
						prop = 'top';
						arr = 'bottom';
					} else {
						prop = 'left';
						arr = 'right';
					}
					var val = parseInt(this.$tip.css(prop));
					from[prop] = val + (hide ? 0 : (this.pos.arrow == arr ? -this.opts.slideOffset : this.opts.slideOffset));
					to[prop] = val + (hide ? (this.pos.arrow == arr ? this.opts.slideOffset : -this.opts.slideOffset) : 0) + 'px';
				}
				if (this.opts.fade) {
					from.opacity = hide ? this.$tip.css('opacity') : 0;
					to.opacity = hide ? 0 : this.opacity;
				}
				this.$tip.css(from).animate(to, this.opts[hide ? 'hideAniDuration' : 'showAniDuration']);
			}
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
			var pos = {l: 0, t: 0, arrow: ''},
				$win = $(window),
				win = {
					l: $win.scrollLeft(),
					t: $win.scrollTop(),
					w: $win.width(),
					h: $win.height()
				}, xL, xC, xR, yT, yC, yB,arrowOuterWH,placement,isAuto=false;
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
				xL = elm.l;	// left edge
				xC = xL + Math.floor(elm.w / 2);				// h center
				xR = xL + elm.w;	    // right edge
				yT = elm.t;	// top edge
				yC = yT + Math.floor(elm.h / 2);				// v center
				yB = yT +elm.h;	// bottom edge
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
                    if (this.opts.keepInViewport) {
                        if (pos.l + this.tipOuterW > win.l + win.w)
                            pos.l = win.l + win.w - this.tipOuterW;
                        else if (pos.l < win.l)
                            pos.l = win.l;
                    }
                    break;
                case "right":
                    arrowOuterWH=this.setArrowAndGetWH(placement);
					pos.l = xR + this.opts.offsetX+arrowOuterWH.W;
                    if (isAuto && pos.l + this.tipOuterW > win.l + win.w){
                        arrowOuterWH=this.setArrowAndGetWH("left");  
                        pos.l =xL - this.tipOuterW - this.opts.offsetX-arrowOuterWH.W;
                    }              
                    break;
                case "left":
                    arrowOuterWH=this.setArrowAndGetWH(placement);
                    pos.l = xL - this.tipOuterW- this.opts.offsetX-arrowOuterWH.W;
                    if (isAuto && pos.l < win.l){
                        arrowOuterWH=this.setArrowAndGetWH("right");
                        pos.l =xR + this.opts.offsetX+arrowOuterWH.W;
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
                    pos.t = yT - this.tipOuterH - this.opts.offsetY-arrowOuterWH.H;
                    // 'left' and 'right' need priority for 'target'
                    if (isAuto && pos.t < win.t) {
                        arrowOuterWH=this.setArrowAndGetWH("bottom");
                        pos.t = yB + this.opts.offsetY+arrowOuterWH.H;
                    }
                    break;
                case "bottom":
                    arrowOuterWH=this.setArrowAndGetWH(placement);
                    pos.t = yB+ this.opts.offsetY +arrowOuterWH.H;
                    // 'left' and 'right' need priority for 'target'
                    if (isAuto && pos.t + this.tipOuterH > win.t + win.h) {
                        arrowOuterWH=this.setArrowAndGetWH("top");
                        pos.t = yT - this.tipOuterH - this.opts.offsetY-arrowOuterWH.H;
                    }
                    break;
				case "right":
                case "left":
                    pos.t = yC - Math.floor(this.tipOuterH / 2);
                    if (this.opts.keepInViewport) {
                        if (pos.t + this.tipOuterH > win.t + win.h)
                            pos.t = win.t + win.h - this.tipOuterH;
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
            this.$arrow[0].className = 'tip-arrow tip-arrow-' + placement;
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
			// unhook live events if 'destroy' is called
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

        // generate CSS for this tip class if not already generated
        
		if (!$('#jPopBox-css-' + opts.className)[0])
			$(['<style id="jPopBox-css-',opts.className,'" type="text/css">',
				'div.',opts.className,'{visibility:hidden;position:absolute;top:0;left:0;}',
				'div.',opts.className,' table.tip-table, div.',opts.className,' table.tip-table td{margin:0;font-family:inherit;font-size:inherit;font-weight:inherit;font-style:inherit;font-variant:inherit;vertical-align:middle;}',
				'div.',opts.className,' td.tip-bg-image span{display:block;font:1px/1px sans-serif;height:',opts.bgImageFrameSize,'px;width:',opts.bgImageFrameSize,'px;overflow:hidden;}',
				'div.',opts.className,' td.tip-right{background-position:100% 0;}',
				'div.',opts.className,' td.tip-bottom{background-position:100% 100%;}',
				'div.',opts.className,' td.tip-left{background-position:0 100%;}',
				'div.',opts.className,' div.tip-inner{background-position:-',opts.bgImageFrameSize,'px -',opts.bgImageFrameSize,'px;}',
				'div.',opts.className,' div.tip-arrow{visibility:hidden;position:absolute;font:1px/1px sans-serif;}',
			'</style>'].join('')).appendTo('head');
        
		// check if we need to hook live events
		if (opts.liveEvents && opts.showOn != 'none') {
			var handler,
				deadOpts = $.extend({}, opts, { liveEvents: false });
			switch (opts.showOn) {
				case 'hover':
					handler = function() {
						var $this = $(this);
						if (!$this.data('jPopBox'))
							$this.jPopBox(deadOpts).jPopBox('mouseenter');
					};
					// support 1.4.2+ & 1.9+
					this.live ?
						this.live('mouseenter.jPopBox', handler) :
						$(document).delegate(this.selector, 'mouseenter.jPopBox', handler);
					break;
				case 'focus':
					handler = function() {
						var $this = $(this);
						if (!$this.data('jPopBox'))
							$this.jPopBox(deadOpts).jPopBox('showDelayed');
					};
					this.live ?
						this.live('focus.jPopBox', handler) :
						$(document).delegate(this.selector, 'focus.jPopBox', handler);
					break;
			}
			return this;
		}

		return this.each(function() {
			new $.JPopBox(this, opts);
		});
	}

	// default settings
	$.fn.jPopBox.defaults = {
		content: 		'[title]',	// content to display ('[title]', 'string', element, function(updateCallback){...}, jQuery)
		className:		'tip-yellow',	// class for the tips
		idName:			'',		// id for the tip
		bgImageFrameSize:	10,		// size in pixels for the background-image (if set in CSS) frame around the inner content of the tip
		showTimeout:		500,		// timeout before showing the tip (in milliseconds 1000 == 1 second)
		hideTimeout:		100,		// timeout before hiding the tip
		timeOnScreen:		0,		// timeout before automatically hiding the tip after showing it (set to > 0 in order to activate)
		showOn:			'hover',	// handler for showing the tip ('hover', 'focus', 'none') - use 'none' to trigger it manually
		liveEvents:		false,		// use live events
		alignTo:		'cursor',	// align/position the tip relative to ('cursor', 'target')
		alignX:			'right',	// horizontal alignment for the tip relative to the mouse cursor or the target element
							// ('right', 'center', 'left', 'inner-left', 'inner-right') - 'inner-*' matter if alignTo:'target'
		alignY:			'top',		// vertical alignment for the tip relative to the mouse cursor or the target element
							// ('bottom', 'center', 'top', 'inner-bottom', 'inner-top') - 'inner-*' matter if alignTo:'target'
		offsetX:		0,		// offset X pixels from the default position - doesn't matter if alignX:'center'
		offsetY:		0,//21,		// offset Y pixels from the default position - doesn't matter if alignY:'center'
		keepInViewport:		true,		// reposition the tooltip if needed to make sure it always appears inside the viewport
		allowTipHover:		true,		// allow hovering the tip without hiding it onmouseout of the target - matters only if showOn:'hover'
		followCursor:		false,		// if the tip should follow the cursor - matters only if showOn:'hover' and alignTo:'cursor'
		fade: 			true,		// use fade animation
		slide: 			true,		// use slide animation
		slideOffset: 		8,		// slide animation offset
		showAniDuration: 	300,		// show animation duration - set to 0 if you don't want show animation
		hideAniDuration: 	300,		// hide animation duration - set to 0 if you don't want hide animation
        refreshAniDuration:	200,		// refresh animation duration - set to 0 if you don't want animation when updating the tooltip asynchronously
        title:'',                       //show title
        placement:'top'                 //如何定位弹出框
	};

})(jQuery);
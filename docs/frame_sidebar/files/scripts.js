(function ($, root, undefined) {
	
	$(function () {
		
		'use strict';
		
    	jQuery(".responsive-title").fitText(1.2, { minFontSize: '25px', maxFontSize: '45px' });
    	jQuery(".navbar-toggler, #backdrop").on('click touch', function () {
    		jQuery(".navbar-toggler").toggleClass("opened");
    		jQuery(".navbar-collapse").toggleClass("show");
    		jQuery("#backdrop").toggleClass("show");
    	})

		var imagesAll = function (array, callback, scope) {
		  for (var i = 0; i < array.length; i++) {
		    callback.call(scope, i, array[i]);
		  }
		};

		var container = document.getElementById('main');
		var maxwidth = container.clientWidth;
		console.log(maxwidth);

		var images = document.querySelectorAll('figure a img');
		imagesAll(images, function (index, value) {
			var width = value.clientWidth;

			if (maxwidth/width > 1.5) {
				var caption = document.querySelector('figure figcaption');
				console.log(caption);
				//caption.style.width = maxwidth - width;
				console.log(index, width);
			}
		});
	});
	
})(jQuery, this);

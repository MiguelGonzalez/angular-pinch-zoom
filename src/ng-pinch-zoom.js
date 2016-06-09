angular.module('ngPinchZoom', [])
/**
 * @ngdoc directive
 * @name ngPinchZoom
 * @restrict A
 * @scope false
 **/
.directive('ngPinchZoom', function() {

  var _directive =  {
    restrict : 'A',
    scope    : false,
    link     : _link
  };

  function _link(scope, element, attrs) {
    var elWidth, elHeight;

    // mode : 'pinch' or 'swipe'
    var mode = '';

    // distance between two touche points (mode : 'pinch')
    var distance = 0;
    var initialDistance = 0;

    // image scaling
    var scale = 1;
    var relativeScale = 1;
    var initialScale = 1;
    var maxScale = parseInt(attrs.maxScale, 10);
    if (isNaN(maxScale) || maxScale <= 1) {
      maxScale = 3;
    }

    // position of the upper left corner of the element
    var positionX = 0;
    var positionY = 0;

    var initialPositionX = 0;
    var initialPositionY = 0;

    // central origin (mode : 'pinch')
    var originX = 0;
    var originY = 0;

    // start coordinate and amount of movement (mode : 'swipe')
    var startX = 0;
    var startY = 0;
    var moveX = 0;
    var moveY = 0;

    var tapedTwice = false;

    var image = new Image();
    image.onload = function() {
      elWidth = element[0].clientWidth;
      elHeight = element[0].clientHeight;

      element.css({
        '-webkit-transform-origin' : '0 0',
        'transform-origin'         : '0 0'
      });

      element.on('touchstart', touchstartHandler);
      element.on('touchmove', touchmoveHandler);
      element.on('touchend', touchendHandler);

      element.on('wheel', onwheelHandler);
    };

    if (attrs.ngSrc) {
      image.src = attrs.ngSrc;
    } else {
      image.src = attrs.src;
    }

    /**
     * @param {object} evt
     */
    function touchstartHandler(evt) {
      var touches = evt.originalEvent ? evt.originalEvent.touches : evt.touches;

      startX = touches[0].clientX;
      startY = touches[0].clientY;
      initialPositionX = positionX;
      initialPositionY = positionY;
      moveX = 0;
      moveY = 0;

      if(!tapedTwice) {
        tapedTwice = true;
        setTimeout(function() {
          tapedTwice = false;
        }, 300);
      } else {

        tapedTwiceHandler();

        evt.preventDefault();

      }
    }

    function tapedTwiceHandler() {
      relativeScale = initialScale = scale = 1;
      positionX = 0;
      positionY = 0;

      transformElement();
    }

    /**
     * @param {object} evt
     */
    function onwheelHandler(evt) {
      var deltaY = 0;

      evt.preventDefault();

      var zoomIn = false;

      if (evt.deltaY) { // FireFox 17+ (IE9+, Chrome 31+?)
        deltaY = evt.deltaY;
      } else if (evt.wheelDelta) {
        deltaY = -evt.wheelDelta;
      }

      if(deltaY < 0) {
        zoomIn = true;
      }

      // As far as I know, there is no good cross-browser way to get the cursor position relative to the event target.
      // We have to calculate the target element's position relative to the document, and subtrack that from the
      // cursor's position relative to the document.
      var rect = element[0].getBoundingClientRect();
      var offsetX = evt.pageX - rect.left - window.pageXOffset;
      var offsetY = evt.pageY - rect.top - window.pageYOffset;

      originX = offsetX -
                element[0].offsetLeft - positionX;
      originY = offsetY -
                element[0].offsetTop - positionX;


      moveX = 0;
      moveY = 0;

      var factorScale = 0.2;

      if(zoomIn) {
        relativeScale += factorScale;
      } else {
        relativeScale -= factorScale;
      }

      if(zoomIn && initialScale === 0) {
        initialScale = 1 + factorScale;
      }

      scale = relativeScale * initialScale;

      positionX = (originX * (1 - relativeScale)) / 2;
      positionY = (originY * (1 - relativeScale)) / 2;

      if (scale <= 1) {
        relativeScale = initialScale = scale = 1;
        positionX = 0;
        positionY = 0;
      }

      transformElement();
    }

    /**
     * @param {object} evt
     */
    function touchmoveHandler(evt) {
      var touches = evt.originalEvent ? evt.originalEvent.touches : evt.touches;

      if (mode === '') {
        if (touches.length === 1 && scale > 1) {

          mode = 'swipe';

        } else if (touches.length === 2) {

          mode = 'pinch';

          initialScale = scale;
          initialDistance = getDistance(touches);
          originX = touches[0].clientX -
                    parseInt((touches[0].clientX - touches[1].clientX) / 2, 10) -
                    element[0].offsetLeft - initialPositionX;
          originY = touches[0].clientY -
                    parseInt((touches[0].clientY - touches[1].clientY) / 2, 10) -
                    element[0].offsetTop - initialPositionY;

        }
      }

      if (mode === 'swipe') {
        evt.preventDefault();

        moveX = touches[0].clientX - startX;
        moveY = touches[0].clientY - startY;

        positionX = initialPositionX + moveX;
        positionY = initialPositionY + moveY;

        transformElement();

      } else if (mode === 'pinch') {
        evt.preventDefault();

        distance = getDistance(touches);
        relativeScale = distance / initialDistance;
        scale = relativeScale * initialScale;

        positionX = originX * (1 - relativeScale) + initialPositionX + moveX;
        positionY = originY * (1 - relativeScale) + initialPositionY + moveY;

        if (scale < 1) {
          scale = 1;
          positionX = 0;
          positionY = 0;
        }

        console.log("Relative Scale: " + relativeScale);
      console.log("originX: " + originX);

      console.log("scale: " + scale);
      console.log("positionX: " + positionX);

        transformElement();

      }
    }

    /**
     * @param {object} evt
     */
    function touchendHandler(evt) {
      var touches = evt.originalEvent ? evt.originalEvent.touches : evt.touches;

      if (mode === '' || touches.length > 0) {
        return;
      }

      if (scale < 1) {

        scale = 1;
        positionX = 0;
        positionY = 0;

      } else if (scale > maxScale) {

        scale = maxScale;
        relativeScale = scale / initialScale;
        positionX = originX * (1 - relativeScale) + initialPositionX + moveX;
        positionY = originY * (1 - relativeScale) + initialPositionY + moveY;

      } else {

        if (positionX > 0) {
          positionX = 0;
        } else if (positionX < elWidth * (1 - scale)) {
          positionX = elWidth * (1 - scale);
        }
        if (positionY > 0) {
          positionY = 0;
        } else if (positionY < elHeight * (1 - scale)) {
          positionY = elHeight * (1 - scale);
        }

      }

      transformElement(0.1);
      mode = '';
    }

    /**
     * @param {Array} touches
     * @return {number}
     */
    function getDistance(touches) {
      var d = Math.sqrt(Math.pow(touches[0].clientX - touches[1].clientX, 2) +
                        Math.pow(touches[0].clientY - touches[1].clientY, 2));
      return parseInt(d, 10);
    }

    /**
     * @param {number} [duration]
     */
    function transformElement(duration) {
      var transition  = duration ? 'all cubic-bezier(0,0,.5,1) ' + duration + 's' : '';
      var matrixArray = [scale, 0, 0, scale, positionX, positionY];
      var matrix      = 'matrix(' + matrixArray.join(',') + ')';

      element.css({
        '-webkit-transition' : transition,
        transition           : transition,
        '-webkit-transform'  : matrix + ' translate3d(0,0,0)',
        transform            : matrix
      });
    }
  }

  return _directive;
});

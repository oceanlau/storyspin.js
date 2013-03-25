/*
 * storyspin.js
 *
 * Automatically turn any valid markdown story into an impress.js presentation
 * with a given spinning style.
 * 
 * Author: https://github.com/oceanlau/
 *
 */

;(function(){
    "use strict"

    //LIB EXTRACTED------------------------------------------------------------
    //these lib functions are extracted from impress.js
    var $ = function(selector, context){
        var context = context || document;
        return context.querySelectorAll(selector);
    };
    
    // `pfx` is a function that takes a standard CSS property name as a parameter
    // and returns it's prefixed version valid for current browser it runs in.
    // The code is heavily inspired by Modernizr http://www.modernizr.com/
    $.pfx = (function () {
        
        var style = document.createElement('dummy').style,
            prefixes = 'Webkit Moz O ms Khtml'.split(' '),
            memory = {};
        
        return function ( prop ) {
            if ( typeof memory[ prop ] === "undefined" ) {
                
                var ucProp  = prop.charAt(0).toUpperCase() + prop.substr(1),
                    props   = (prop + ' ' + prefixes.join(ucProp + ' ') + ucProp).split(' ');
                
                memory[ prop ] = null;
                for ( var i in props ) {
                    if ( style[ props[i] ] !== undefined ) {
                        memory[ prop ] = props[i];
                        break;
                    }
                }
            
            }
            
            return memory[ prop ];
        };
    
    })();
    
    // `arrayify` takes an array-like object and turns it into real Array
    // to make all the Array.prototype goodness available.
    $.arrayify = function ( a ) {
        return [].slice.call( a );
    };
    
    // `css` function applies the styles given in `props` object to the element
    // given as `el`. It runs all property names through `pfx` function to make
    // sure proper prefixed version of the property is used.
    $.css = function ( el, props ) {
        var key, pkey;
        for ( key in props ) {
            if ( props.hasOwnProperty(key) ) {
                pkey = $.pfx(key);
                if ( pkey !== null ) {
                    el.style[pkey] = props[key];
                }
            }
        }
        return el;
    };

    $.byId = function(id){
        return document.getElementById(id);
    };

    $.empty = function(){ return false; };

    //HELP FUNCTIONS------------------------------------------------------------
    //these help functions are extracted from impress.js

    // `translate` builds a translate transform string for given data.
    var translate = function ( t ) {
        return " translate3d(" + t.x + "px," + t.y + "px," + t.z + "px) ";
    };
    
    // `rotate` builds a rotate transform string for given data.
    // By default the rotations are in X Y Z order that can be reverted by passing `true`
    // as second parameter.
    var rotate = function ( r, revert ) {
        var rX = " rotateX(" + r.x + "deg) ",
            rY = " rotateY(" + r.y + "deg) ",
            rZ = " rotateZ(" + r.z + "deg) ";
        
        return revert ? rZ+rY+rX : rX+rY+rZ;
    };
    
    // `scale` builds a scale transform string for given data.
    var scale = function ( s ) {
        return " scale(" + s + ") ";
    };
    
    // `perspective` builds a perspective transform string for given data.
    var perspective = function ( p ) {
        return " perspective(" + p + "px) ";
    };
        
    var storyspinSupported = 
        // browser should support CSS 3D transtorms 
        ( $.pfx("perspective") !== null ) &&
       
       // and `classList` and `dataset` APIs
       ( document.body.classList ) &&
       ( document.body.dataset ) &&
       
       // but some mobile devices need to be blacklisted,
       // because their CSS 3D support or hardware is not
       // good enough to run impress.js properly, sorry...
       ( navigator.userAgent.toLowerCase().search(/(iphone)|(ipod)|(android)/) === -1 );


    //STORYSPIN API-----------------------------------------------------------
    var storyspin = window.storyspin = function(options){

        var options = options || {};

        var rootId = options.rootId || "storyspin";
        
        var dom = {
            body: document.body,
            root: $.byId(rootId),
            storyElementDoms: [],
            storyElementWraps: []
        }

        //Render the markdown content
        //For now the markdown only comes from the div.
        //var storyText = dom.root.textContent;//there may be code in the md
        var storyText = dom.root.innerHTML;

        //Clear the raw markdown text.
        dom.root.innerHTML = '';

        var converter = new Showdown.converter();
        var storyHTML = converter.makeHtml(storyText);

        dom.root.innerHTML = storyHTML;

        //check if the impress.js is supported
        if(!storyspinSupported){
            return {
                init: $.empty
            }
        }

        //configure the showcases, which contain story element
        var config = {
            //Showcase square side length.
            //Only square showcase is supported. It's easy on math.
            squareSideLen: options.squareSideLen || 600,
            //These lengths are tested from the smallest figure to the largest.
            //In order to find out the smallest square that is able to contain 
            //the whole story element.
            //And then we can give it the largest scale.
            squareFittingLens: options.squareFittingLens 
                                || [100, 200, 300, 400, 500, 600],
            //This option is given to fit the story.
            stepFont: options.stepFont || 'normal 36px "PT Serif", georgia, serif'
        };
        
        //Calculate and configure the size and scale of the story element to 
        //make the most use of space in showcase.
        var fitTheShowcase = function(storyElementDom){
            //The number of test lengths given.
            var squareFittingChances = config.squareFittingLens.length;
            //Default scale.
            var storyElementDomScale = 1;
            //Make it block to set the width and get the offsetHeight.
            storyElementDom.style.display = 'block';

            for(var i = 0; i < squareFittingChances; i++){
                var squareFittingLen = config.squareFittingLens[i];

                //Set the width with the length given.
                storyElementDom.style.width = squareFittingLen + 'px';
                //Check if this size of the block is able to contain the element.
                if(storyElementDom.offsetHeight <= squareFittingLen){
                    //If the size fit. (Confirm the size and) Scale the element. 
                    storyElementDomScale = config.squareSideLen/squareFittingLen;
                    $.css(storyElementDom, {
                        transformOrigin: 'top left',
                        transform: scale(storyElementDomScale)
                    })
                    break;
                } else {
                    //If the height exceeds. Then the length of the square is
                    //too small. Try next.
                    continue;
                }
            }
        }

        //Calculate and configure the locations and sizes of the showcases.
        var init = function(){
            
            var storyElementNodes = dom.root.getElementsByTagName('*');
            dom.storyElementDoms = $.arrayify(storyElementNodes);
            //clear the rendered markdown.
            dom.root.innerHTML = '';

            var storyElementDomsCount = dom.storyElementDoms.length;

            var showcaseLens = [config.squareSideLen, config.squareSideLen];
            var showcaseOrientations = [0];
            //The left and bottom corner point of the showcase is used to get
            //the center point of the showcase.
            var showcaseLBCoords = [[-config.squareSideLen/2, config.squareSideLen/2]];
            //First center point coordinate is given as the origin of the coordinates.
            var showcaseCoords = [[0 ,0]];

            for(var i = 0; i < storyElementDomsCount; i++){
                console.log('%c Process showcase: ' + i, 'color: blue');
                if(i>1){
                    //Showcase lengths are a Fibonacci Sequence.
                    showcaseLens[i] = showcaseLens[i-1] + showcaseLens[i-2];
                    console.log('showcase ' + i + ' side len: ' + showcaseLens[i]);
                }
                if(i>0){
                    var remainder = i % 4;
                    if(remainder === 0){
                        showcaseOrientations[i] = 0;
                        //Initialize a new corner point coordinate container.
                        showcaseLBCoords[i] = [];
                        showcaseLBCoords[i][0] = showcaseLBCoords[i-1][0];
                        showcaseLBCoords[i][1] = showcaseLBCoords[i-1][1]+showcaseLens[i-1]+showcaseLens[i];
                        console.log('showcaseLBCoords: '+ showcaseLBCoords[i].toString());
                        //Initialize a new center point coordinate container.
                        showcaseCoords[i] = [];
                        showcaseCoords[i][0] = showcaseLBCoords[i][0] + showcaseLens[i]/2
                        showcaseCoords[i][1] = showcaseLBCoords[i][1] - showcaseLens[i]/2
                        console.log('showcaseCoords: '+ showcaseCoords[i].toString());
                    } else if(remainder === 1){
                        showcaseOrientations[i] = -90;
                        showcaseLBCoords[i] = [];
                        showcaseLBCoords[i][0] = showcaseLBCoords[i-1][0]+showcaseLens[i-1]+showcaseLens[i];
                        showcaseLBCoords[i][1] = showcaseLBCoords[i-1][1];
                        console.log('showcaseLBCoords: '+ showcaseLBCoords[i].toString());
                        showcaseCoords[i] = [];
                        showcaseCoords[i][0] = showcaseLBCoords[i][0] - showcaseLens[i]/2
                        showcaseCoords[i][1] = showcaseLBCoords[i][1] - showcaseLens[i]/2
                        console.log('showcaseCoords: '+ showcaseCoords[i].toString());
                    } else if(remainder === 2){
                        showcaseOrientations[i] = -180;
                        showcaseLBCoords[i] = [];
                        showcaseLBCoords[i][0] = showcaseLBCoords[i-1][0];
                        showcaseLBCoords[i][1] = showcaseLBCoords[i-1][1]-showcaseLens[i-1]-showcaseLens[i];
                        console.log('showcaseLBCoords: '+ showcaseLBCoords[i].toString());
                        showcaseCoords[i] = [];
                        showcaseCoords[i][0] = showcaseLBCoords[i][0] - showcaseLens[i]/2
                        showcaseCoords[i][1] = showcaseLBCoords[i][1] + showcaseLens[i]/2
                        console.log('showcaseCoords: '+ showcaseCoords[i].toString());
                    } else if(remainder === 3){
                        showcaseOrientations[i] = -270;
                        showcaseLBCoords[i] = [];
                        showcaseLBCoords[i][0] = showcaseLBCoords[i-1][0]-showcaseLens[i-1]-showcaseLens[i];
                        showcaseLBCoords[i][1] = showcaseLBCoords[i-1][1];
                        console.log('showcaseLBCoords: '+ showcaseLBCoords[i].toString());
                        showcaseCoords[i] = [];
                        showcaseCoords[i][0] = showcaseLBCoords[i][0] + showcaseLens[i]/2
                        showcaseCoords[i][1] = showcaseLBCoords[i][1] + showcaseLens[i]/2
                        console.log('showcaseCoords: '+ showcaseCoords[i].toString());
                    }
                }

                dom.storyElementWraps[i] = document.createElement('div');

                //Required from impress.js.
                dom.storyElementWraps[i].classList.add('step');
                //Configure the showcases.
                dom.storyElementWraps[i].setAttribute('data-x', showcaseCoords[i][0]);
                dom.storyElementWraps[i].setAttribute('data-y', showcaseCoords[i][1]);
                dom.storyElementWraps[i].setAttribute('data-rotate', showcaseOrientations[i]);
                dom.storyElementWraps[i].setAttribute('data-scale', showcaseLens[i]/showcaseLens[0]);
                $.css(dom.storyElementWraps[i], {
                    width: config.squareSideLen + 'px',
                    height: config.squareSideLen + 'px',
                    font: config.stepFont
                })

                dom.storyElementWraps[i].appendChild(dom.storyElementDoms[i]);

                dom.root.appendChild(dom.storyElementWraps[i]);

                //Configure the story element inside the showcase after it is 
                //rendered. Or else the offsetHeight will be 0.
                fitTheShowcase(dom.storyElementDoms[i]);
            }
            
            //Get the last thing ready for impress.js
            dom.root.id="impress";

            return {
                impress: impress
            }
        }

        return {
            init: init
        }

    }

})();

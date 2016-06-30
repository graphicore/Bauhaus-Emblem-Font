define([
    'BEF/errors'
  , 'require/domReady'
  , 'Atem-IO/io/static'
  , 'Atem-IO/io/InMemory'
  , 'CPSController'
  , 'Atem-CPS/CPS/RuleController'
  , 'Atem-CPS/CPS/SelectorEngine'
  , 'Atem-Pen-Case/pens/SVGPen'
  , 'BEF/BEOM/Root'
  , 'BEF/foresting/SceneBuilder'
  , 'BEF/foresting/FontBuilder'
  , 'angular'
  , 'BEF/angular/app'
  , 'Atem-CPS-Toolkit/services/dragAndDrop/DragDataService'
  , 'Atem-CPS-Toolkit/services/dragAndDrop/DragIndicatorService'
  , './cpsTools'
], function(
    errors
  , domReady
  , staticIO
  , InMemoryIO
  , CPSController
  , RuleController
  , SelectorEngine
  , SVGPen
  , Root
  , SceneBuilder
  , FontBuilder
  , angular
  , angularApp
  , DragDataService
  , DragIndicatorService
  , cpsTools
) {
    var svgns = 'http://www.w3.org/2000/svg'
      , ValueError = errors.Value
      ;

    // monkeypatching, arcto, it's not an original part of the pen protocol
    // I could add it to svg pen anyways. It's in SVG, so it's ok when
    // the SVG pen has it. And it stays compatible with the protocol.

    SVGPen.prototype.arcTo = function(pt, r1, r2, angle, largeArcFlag, sweepFlag) {
            var segment = ['A', r1, r2, angle, largeArcFlag ? '1' : '0',
                           sweepFlag ? "1" : "0" , pt[0], pt[1]
            ].join(' ');
            this._addSegment(segment);
            this.__currentPoint = pt;
    };

    function degree(theta) {
        return theta * 180/Math.PI;
    }

    function drawGlyph(glyph, pen) {
        var i, l
          , commands = glyph.children
          , command, styleDict, rx
          ;

        for(i=0,l=commands.length;i<l;i++) {
            command = commands[i];
            styleDict = command.getComputedStyle();
            switch(styleDict.get('cmd')) {
                case 'lineTo':
                    // function could be configured in cps
                    // we'd need here a whitelist for allowed calls
                    // allowed calls we be validated
                    // also all the arguments used here!

                    // plus for each allowed call a method that gathers
                    // the args from CPS, defaulting if possible to something
                    // usable, like 0 for not set flags.
                    // also args could be a List in CPS
                    pen.lineTo(styleDict.get('coord').valueOf());
                    break;
                case 'curveTo':
                    // function could be configured in cps
                    // we'd need here a whitelist for allowed calls
                    // plus for each allowed call a method that gathers
                    // the args from CPS, defaulting if possible to something
                    // useable, like 0 for not set flags.
                    // also args could be a List in CPS
                    pen.lineTo(styleDict.get('ctrl1').valueOf(), styleDict.get('ctrl2').valueOf(), styleDict.get('coord').valueOf());
                    break;
                case 'arcTo':
                    rx = styleDict.get('rx');
                             // The absolute X/Y coordinate vector for the
                             // end point of this path segment.
                    pen.arcTo(styleDict.get('coord').valueOf()
                             // The x-axis radius for the ellipse (i.e., r1).
                           , rx
                             // The y-axis radius for the ellipse (i.e., r2).
                           , styleDict.get('ry', rx)
                            // The rotation angle in **degrees** for the ellipse's
                            // x-axis relative to the x-axis of the user
                            // coordinate system.
                            // we won't need to write this often, I expect,
                            // so I opt for a very descriptive name
                            // Ellipses are untried yet anyways and won't
                            // be part of the initial offer.
                           , degree(styleDict.get('ellipseRotation', 0))
                           // The value of the large-arc-flag parameter.
                           , styleDict.get('largeArcFlag', 0)
                           //  The value of the sweep-flag parameter.
                           , styleDict.get('sweepFlag', 0)
                    );
                    break;
                case 'moveTo':
                    pen.moveTo(styleDict.get('coord').valueOf());
                    break;
                case 'close':
                    pen.closePath();
                    break;
                default:
                    throw new ValueError('Unknown command type: ' + command.type);
            }
        }
        pen.endPath();
    }

    function drawLine (line, container) {
        var i, l, path, pen, glyph, styleDict//, verticalStart
          , glyphs = line.children
          ;
        for(i=0,l=glyphs.length;i<l;i++) {
            path = container.ownerDocument.createElementNS(svgns, 'path');
            pen = new SVGPen(path, {});
            glyph = glyphs[i];
            styleDict = glyph.getComputedStyle();
            drawGlyph(glyph, pen);
            container.appendChild(path);
        }
    }

    function drawScene (scene, container) {
        var lineElement, i, l
          , lines = scene.children
          ;
        for(i=0,l=lines.length;i<l;i++) {
            lineElement = container.ownerDocument.createElementNS(svgns, 'g');
            drawLine(lines[i], lineElement);
            container.appendChild(lineElement);
        }
    }

    function getIO() {
        var io = new InMemoryIO();
        io.mkDir(false, 'cps');
        io.writeFile(false, 'cps/main.cps',  staticIO.readFile(false, 'project/cps/main.cps'));
        return io;
    }

    function main() {
        /* global document:true, window:true*/
        var cpsDir = 'cps'
          , io = getIO()
          , fontData = staticIO.readFile(false, 'project/font.yaml')
          , selectorEngine = new SelectorEngine()
          , ruleController = new RuleController(io, cpsDir, cpsTools.initializePropertyValue, selectorEngine)
          , controller = new CPSController( ruleController, Root.factory, selectorEngine)
          , root = controller.rootNode
          , svg = document.createElementNS(svgns, 'svg')
          , fontBuilder = FontBuilder.fromYAML(root.font, fontData)
          , scene = root.scene
          , builder = new SceneBuilder(fontBuilder, scene)
          , timeout
          ;

        svg.setAttribute('width', '600px');
        svg.setAttribute('viewBox', '0 0 600 600');
        svg.style.border = '1px solid black';

        var input = document.createElement('textarea');
        input.value = 'ALL YOUR BAUHAUS ARE BELONG TO US';
        input.style.verticalAlign = 'top';

        // changes in the cps of child nodes are also monitored by this
        // This is firering too often. Probably the deletion of items before
        // is causing a loop. It seems that this bever stops. check!
        var lastVal, subscription = null;
        var update = (function (reflow) {
            while(svg.children.length)
                svg.removeChild(svg.lastChild);

            // do we want to do this even when this.value did not change?
            if(!reflow && lastVal !== this.value) {
                lastVal = this.value;
                builder.setScene(this.value);
            }
            else if(reflow) {
                // reflow ...
                builder.reflow();
                // I did't have enough control to
                // prevent a never ending feedback loop here.
                // so I had to invent this method.
                scene.flushStyleChanges();

            }
            drawScene(scene, svg);
        }).bind(input);

        var onchange = function(even, reflow) {
            // some debouncing
            //window.cancelAnimationFrame(timeout);
            //timeout = window.requestAnimationFrame(update);
            clearTimeout(timeout);
            // this 10 msec timeout yields in much less calls to update
            // than requestAnimationFrame. And since it is at a very high
            // level, I think it's ok like this. (Until we have a better
            // solution for the overall event system.)
            timeout = setTimeout(update, 10, reflow);
        };

        input.addEventListener('input', onchange);
        update.call(input);

        subscription = scene.on(['CPS-change'], function() {
            onchange(undefined, true);
        });

        function inputDirective() {
            function link(scope, element, attrs, controller) {
                //jshint unused: vars
                var  domElement = element[0];
                domElement.appendChild(input);
            }
            return {
                restrict: 'E'
              , link: link
            };
        }
        function canvasDirective() {
            function link(scope, element, attrs, controller) {
                //jshint unused: vars
                var  domElement = element[0];
                domElement.appendChild(svg);
            }
            return {
                restrict: 'E'
              , link: link
            };
        }
        angularApp.directive('befInput', inputDirective);
        angularApp.directive('befCanvas', canvasDirective);

        var dragDataService = new DragDataService()
          , dragIndicatorService = new DragIndicatorService()
          ;
        angularApp.constant('cpsTools', cpsTools);
        angularApp.constant('cpsController', controller);
        angularApp.constant('ruleController', ruleController);
        angularApp.constant('dragDataService', dragDataService);
        angularApp.constant('dragIndicatorService', dragIndicatorService);
        angular.bootstrap(document, [angularApp.name]);

        // temporarily until we have project management
        window.dumpCPS = function() {
            var win = window.open()
              , document
              , content
              ;
            if(!win) return;
            document = win.document;
            content = document.createElement('pre');
            content.innerText = ruleController.getRule(false, cpsFile) + '';
            document.body.appendChild(content);
        };
    }
    return domReady.bind(null, main);
});

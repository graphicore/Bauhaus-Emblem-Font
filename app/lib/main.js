require([
    'BEF/errors'
  , 'require/domReady'
  , 'Atem-IO/io/static'
  , 'CPSController'
  , 'Atem-CPS/CPS/RuleController'
  , 'Atem-CPS/CPS/SelectorEngine'
  , 'Atem-Pen-Case/pens/SVGPen'
  , 'BEF/BEOM/Root'
  , 'BEF/foresting/SceneBuilder'
  , 'BEF/foresting/FontBuilder'
  , './cpsTools'
], function(
    errors
  , domReady
  , staticIO
  , CPSController
  , RuleController
  , SelectorEngine
  , SVGPen
  , Root
  , SceneBuilder
  , FontBuilder
  , cpsTools
) {
    var svgns = 'http://www.w3.org/2000/svg'
      , xlinkns = 'http://www.w3.org/1999/xlink'
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
          , cursorPosition = 0
          ;
        for(i=0,l=glyphs.length;i<l;i++) {
            path = container.ownerDocument.createElementNS(svgns, 'path');
            pen = new SVGPen(path, {});
            glyph = glyphs[i];
            styleDict = glyph.getComputedStyle();
            drawGlyph(glyph, pen);
            //verticalStart = cursorPosition + styleDict.get('before');
            //path.setAttribute('transform', 'translate(270 270) rotate('+degree(verticalStart)+')');
            //cursorPosition += styleDict.get('verticalAdvance');
            container.appendChild(path);
        }
        // cursorPosition equals line-length, we need that for align.
        // (We could write line-length into the property dict of the line)
        // and then let it calculate the total rotation for us.
        // FIXME: now rotate line controlled some CPS values
        // Maybe something like: align: String "left"|"center"|"right"
        // + rotate: Number radians
        // NOW: cursorPosition is lineStyle.get('length', 0)

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

    function main() {
        /* global document:true*/
        var cpsDir = 'project/cps'
        // todo, copy to an InMemory Location?
          , io = staticIO
          , fontData = io.readFile(false, 'project/font.yaml')
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

        svg.setAttribute('width', '800px');
        svg.setAttribute('viewBox', '0 0 800 800');
        svg.style.border = '1px solid black';

        var input = document.createElement('textarea');
        input.value = 'ALL YOUR BAUHAUS ARE BELONG TO US';
        input.style.verticalAlign = 'top';

        document.body.appendChild(input);
        document.body.appendChild(svg);

        var update = (function () {
            while(svg.children.length)
                svg.removeChild(svg.lastChild);
            builder.setScene(this.value);
            drawScene(scene, svg);
        }).bind(input);

        var onchange = function() {
            // some debouncing
            window.cancelAnimationFrame(timeout);
            timeout = window.requestAnimationFrame(update);
        };
        // changes in the cps of child nodes are also monitored by this
        // This is firering too often. Probably the deletion of items before
        // is causing a loop. It seems that this bever stops. check!
        // root.on('CPS-change', onchange.bind(input));
        input.addEventListener('input', onchange);
        update.call(input);
    }
    domReady(main);
});

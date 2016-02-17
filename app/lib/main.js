require([
    'BEF/errors'
  , 'require/domReady'
  , 'PenCase/SVGPen'
  , 'BEF/BEOM/Root'
  , 'BEF/foresting/SceneBuilder'
  , 'BEF/foresting/Font'
  , 'require/text!./fontData.yaml'
], function(
    errors
  , domReady
  , SVGPen
  , Root
  , SceneBuilder
  , Font
  , fontData
) {
    var svgns = 'http://www.w3.org/2000/svg'
      , xlinkns = 'http://www.w3.org/1999/xlink'
      , ValueError = errors.Value
      ;

    // monkeypatching, arcto, it's not an original part of the pen protocol
    // I could add it to svg pen anyways. It's in SVG, so it's ok when
    // the SVG pen has it. And it stays compatible with the protocol.
    SVGPen.prototype._commands.arcTo = 'createSVGPathSegArcAbs';
    SVGPen.prototype.arcTo = function(pt, r1, r2, angle, largeArcFlag, sweepFlag) {
            this._addSegment('arcTo', [pt, r1, r2, angle, largeArcFlag, sweepFlag]);
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
            switch(command.type) {
                case 'lineto':
                    // function could be configured in cps
                    // we'd need here a whitelist for allowed calls
                    // plus for each allowed call a method that gathers
                    // the args from CPS, defaulting if possible to something
                    // useable, like 0 for not set flags.
                    // also args could be a List in CPS
                    pen.lineTo(styleDict.get('coord'));
                    break;
                case 'arcto':
                    rx = styleDict.get('rx');
                             // The absolute X/Y coordinate vector for the
                             // end point of this path segment.
                    pen.arcTo(styleDict.get('coord')
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
                           , styleDict.get('LargeArcFlag', 0)
                           //  The value of the sweep-flag parameter.
                           , styleDict.get('sweepFlag', 0)
                    );
                    break;
                case 'moveto':
                    pen.moveTo(styleDict.get('coord'));
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
        var i, l, path, pen
          , glyphs = line.children
          , glyph
          // set via cps? use line length or something to make center alignment etc.
          // maybe we have to align the line when finished drawing, then
          // verticalPosition equals line-length.
          , verticalPosition = 0
          ;
        for(i=0,l=glyphs.length;i<l;i++) {
            path = container.ownerDocument.createElementNS(svgns, 'path');
            pen = new SVGPen(path, {});
            glyph = glyphs[i];
            drawGlyph(glyph, pen);

            path.setAttribute('transform', 'translate(270 270) rotate('+degree(verticalPosition)+')');
            verticalPosition += glyph.getComputedStyle().get('verticalAdvance');

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

    function main() {
        /* global document:true*/
        var svg = document.createElementNS(svgns, 'svg')
          , font = Font.fromYAML(fontData)
          , builder = new SceneBuilder(font)
          , root = new Root()
          , scene = root.scene
          ;
        svg.setAttribute('width', '100%');
        svg.setAttribute('viewBox', '0 0 1200 1200');

        var input = document.createElement('textarea');
        input.value = 'ALL YOUR BAUHAUS ARE BELONG TO US';

        document.body.appendChild(input);
        document.body.appendChild(svg);

        var onchange = function() {
            if(scene.children.length) {
                // FIXME: memory Leak! this is just a hint what should happen
                // here, it's not the-right-way(tm) to do it.
                scene.children.reverse().map(function(line){ this.remove(line);}, scene);

                while(svg.children.length)
                    svg.removeChild(svg.lastChild);
            }
            builder.setScene(scene, this.value.toUpperCase());
            drawScene(scene, svg);
        };
        // changes in the cps of child nodes are also monitored by this
        root.on('CPS-change', onchange);
        input.addEventListener('input', onchange);
        onchange.call(input);
    }
    domReady(main);
});

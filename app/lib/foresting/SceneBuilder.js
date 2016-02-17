define([
    'Atem-CPS/OMA/_Node'
  , 'BEF/BEOM/Line'
  , 'BEF/BEOM/Glyph'
], function(
    Parent
  , Line
  , Glyph
) {
    "use strict";

    function LineIsFullError(message) {
        this.message = message;
        this.name = 'LineIsFullError';
    }

    function SceneBuilder(font) {
        this._font = font;
    }

    var _p = SceneBuilder.prototype;

    /**
     * FIXME: old behavior was reset the text, but keep the lines and their
     * configuration But that is hard. Maybe we can do some sort of diff
     * update if speed becomes a matter.
     *
     * Do we need it this grained? We could just dump the whole scene at once
     */
    _p.reset = function() {
        // FIXME: This is a memory leak! The removed nodes never get removed
        // from the OMA-Controller. Maybe a Weakmap could help there. Or we
        // need an official way to "erase" them. Probably smart, because then
        // we can trigger an event to inform all the dependent style dicts.
        // That event should probably be triggered on "remove" already, as
        // the node then is selectable anymore, hence, it can't hav deps via
        // CPS.
        // At the moment "node.remove" can be considered broken. This will
        // be one of the tasks for the next weeks.
        function eraseChildren(node) {
            var children = node.children.reverse()
              , i, l
              ;
            for(i=0,l=children.length;i<l;i++)
                node.remove(children[i]);
        }
        eraseChildren(this._scene);
    };

    _p._set = function(line, verticalPosition, glyphId) {
        var glyph = new Glyph()
          , verticalAdvance
          // If we use CPS to control this it would also be a way to return
          // +Infinity. And that is a good start for a never ending spiral line
          // Just to keep the thought around somewhere.
          , maxLineLength = 2*Math.PI // line.getComputedStyle().get('maxLineLength');
          ;
        // We'll make a lot of duplicates per glyph. There's not yet a
        // smarter way in OMA (metacomponents FTW …)
        this._font.drawGlyph(glyphId, glyph);
        line.add(glyph);

        // no we can get the verticalAdvance from CPS
        verticalAdvance = glyph.getComputedStyle().get('verticalAdvance');
        // TODO: add kerning
        if(verticalAdvance + verticalPosition > maxLineLength){
            line.remove(glyph);
            throw new LineIsFullError(['Line is full at "', glyphId , '" (', line.children.length, ')'].join(''));
        }

        return verticalAdvance;
    };

    _p.setLine = function(line, glyphs, index) {
        var consumed, i, l, verticalPosition = 0;
        try {
            for(consumed=0,l=glyphs.length; (i = index + consumed) < l; consumed++) {
                if(glyphs[i] === '\n') {
                    consumed += 1;
                    break;
                }
                verticalPosition += this._set(line, verticalPosition, glyphs[i]);
            }
        }
        catch(e) {
            if(e instanceof LineIsFullError)
                return i;
            throw e;
        }
        return consumed;
    };

    _p.shape = function(text) {
        var glyphs = []
          , lengths = this._font.glyphCodesLengthList
          , i, l, len, token
          , index = 0
          ;

        tokenizer: while(index < text.length) {
            if(text[index] === '\n') {
                glyphs.push('\n');
                index += 1;
                continue;
            }
            for(i=0,l=lengths.length;i<l;i++) {
                len = lengths[i];
                if(text.length < len)
                    continue;
                token = text.substr(index, len);
                if(!this._font.has(token))
                    continue;
                glyphs.push(token);
                index += len;
                continue tokenizer;
            }
            // not found!
             glyphs.push(this._font.notDefGlyph);
             index += 1;

        }
        return glyphs;
    };

    _p.setScene = function(scene, text) {
        var consumed
          , lineNo = 0
          , glyphs = this.shape(text)
          , line
          , i,l
          ;
        for(i=0,l=glyphs.length;i<l;) {
            line = new Line();
            this._scene.add(line);
            consumed = this.setLine(line, glyphs, i);
            if(!consumed) {
                // If consumed is 0 we may never finish.
                // Apeirophobia is the fear of infinity.
                /* global console:true*/
                console.warn('Apeirophobia: line:i(' + line.index
                                + ') did not consume any glyph, breaking.');
                break;
            }
            i += consumed;
        }
    };

    return SceneBuilder;
});
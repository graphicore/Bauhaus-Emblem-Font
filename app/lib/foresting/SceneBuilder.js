define([
    'BEF/BEOM/Line'
  , 'BEF/BEOM/Glyph'
], function(
    Line
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

    _p._set = function(line, verticalPosition, glyphId) {
        var glyph
          , referenceGlyph
          , verticalAdvance
          // If we use CPS to control this it would also be a way to return
          // +Infinity. And that is a good start for a never ending spiral line
          // Just to keep the thought around somewhere.
          , maxLineLength = 2*Math.PI // line.getComputedStyle().get('maxLineLength');
          ;
        // We'll make a lot of duplicates per glyph. There's not yet a
        // smarter way in OMA (metacomponents FTW …)
        // It could be a wise idea for speed to implement fast id fetching
        // in OMA and SelectorEngine.
        // SelectorEngine is probably hard, but an id index in OMA
        // would be great here.
        // For a short term relief, we could make it just for font.
        // Is probably a good idea to collect some experience with this anyways.
        referenceGlyph = line.root.font.query('glyph#' + glyphId);
        glyph = referenceGlyph.clone(false);
        // can't use the glyph id here, because there will be duplicates
        glyph.id = null;
        // this is a bit experimental but should work out just fine
        // referenceNode is in the _cps_whitelist of Glyph.
        // It's also kind of a nice approaching of the yet to come metacomponents
        glyph.referenceNode = referenceGlyph;
        line.add(glyph)

        // now we can get the verticalAdvance from CPS
        verticalAdvance = glyph.getComputedStyle().get('verticalAdvance');
        // TODO: add kerning
        if(verticalAdvance + verticalPosition > maxLineLength) {
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
                glyphs.push(this._font.getId(token));
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
            scene.add(line);
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

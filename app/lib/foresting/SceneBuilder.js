define([
    'BEF/BEOM/Line'
  , 'BEF/BEOM/Glyph'
  , 'BEF/diff'
], function(
    Line
  , Glyph
  , diff
) {
    "use strict";

    function SceneBuilder(fontBuilder, scene) {
        this._fontBuilder = fontBuilder;
        this._scene = scene;
        this._leftOver = [];
    }

    var _p = SceneBuilder.prototype;

    _p._cast = function(referenceGlyph) {
        // We'll make a lot of duplicates per glyph. There's not yet a
        // smarter way in OMA (metacomponents FTW …)
        // 2 = cloneClasses, 8 = cloneAttachedData, 10 = setBaseNode
        var glyph = referenceGlyph.clone(2 | 8 | 0x10);
        // can't use the glyph id here, because there will be duplicates
        glyph.setClass('ref_' + glyph.baseNode.id);
        return glyph;
    };

    _p._set = function(line, glyph, styleDict, maxLineLength) {
        var lineLength;

        line.add(glyph);
        lineLength = styleDict.get('length', 0);

        // TODO: add kerning?
        if(lineLength > maxLineLength) {
            line.remove(glyph);
            // line is full
            return true;
        }
        // line can try at least one more
        return false;
    };

    _p._setLine = function(line, glyphs, index) {
        var consumed = 0, i, l, lineIsFull
            , styleDict = line.getComputedStyle()
             // To return +Infinity would be a good start for a never ending
             // spiral line. Just to keep the thought around somewhere.
            , maxLength = styleDict.get('maxLength')
            ;

        for(i=index,l=glyphs.length;i<l; i++) {
            lineIsFull = this._set(line, glyphs[i], styleDict, maxLength);
            if(lineIsFull)
                break;
            consumed += 1;
            if (glyphs[i].baseNode.id === 'br')
                break;
        }

        return consumed;
    };

    _p._setLines = function(glyphs, lines /* optional */) {
        var i, l, line
          , consumed
          , glyphs_
          ;
        glyphs_ = glyphs.concat(this._leftOver);
        this._leftOver = [];


        for(i=0,l=glyphs_.length;i<l;) {
            // TODO: this is a very good occasion for a generator
            if(lines && lines.length) {
                line = lines.shift();
            }
            else {
                line = new Line();
                this._scene.add(line);
            }

            consumed = this._setLine(line, glyphs_, i);
            if(!consumed) {
                // If consumed is 0 we may never finish.
                // Apeirophobia is the fear of infinity.
                /* global console:true*/
                console.warn('Apeirophobia: line:i(' + line.index
                                + ') did not consume any glyph, breaking.');
                // OK, so this works BUT has one problem: If for example
                // no glyph was used at all, it is likely that no cps-change
                // event will trigger reflow, even after the problem that
                // caused the apeirophobia has been solved! It would be
                // better to have a line within the scene that takes all
                // the left over glyphs, but that is not rendered to the svg.
                // That way all changes would really be applied to the
                // glyphs and thus the events would flow. I leave this open
                // for later.
                this._leftOver = glyphs_.slice(i);
                break;
            }
            i += consumed;
        }
    };

    _p._applyPatch = function(script, types) {
        var i, l, cmd, line
          , currentLine = null
          , offset = 0
          , firstLineIndex = null, idx, lineItemIndex, type
            // The indexes in types correspond to the indexes in the commands
            // of the patch script. We use them to find the right line to
            // operate on and an offset from glyph indexes to line indexes.
          , lineData = types.map(function(t){return [t.parent, t.index];})
          , data
          ;

        for(i=0,l=script.length;i<l;i++) {
            cmd = script[i];
            // this happens if the an insert appends to the end
            lineItemIndex = lineData.length === cmd[1] ? cmd[1]-1 : cmd[1];

            data = lineData[lineItemIndex];
            line = data[0];
            if(line !== currentLine) {
                // The line changed. recalculate the offset of the command
                // indexes to the line indexes
                offset = data[1] - lineItemIndex;
                currentLine = line;
                if(firstLineIndex === null)
                    // all lines from this on will have to reflow
                    firstLineIndex = line.index;
            }

            idx = cmd[1] + offset;
            if(cmd[0]==='D') {
                line.splice(idx, 1);
                offset -= 1;
            }
            else if (cmd[0] === 'I') {
                type = this._cast(cmd[2]);
                line.splice(idx, 0, type);
                offset += 1;
            }
            else
                throw new Error('Command "'+cmd[0]+'" unknown at index '
                                            + i + ' ['+cmd.join(', ')+'])');
        }
        return firstLineIndex;
    };

    /**
    This is very expensive.

    I leave it in here as a reference for the current reflow method,
    which is much faster, but also much more complex and it reuses less
    common code than this implementation via `this._setLines(glyphs, lines);`

    _p.reflow = function(firstLineIndex) {
        var lines = this._scene.children.slice(firstLineIndex || 0)
          , i, l, line
          , glyphs = []
          ;
        for(i=0,l=lines.length;i<l;i++) {
            line = lines[i];
            // Empties the line and stores it's children in glyphs
            Array.prototype.push.apply(glyphs, line.splice(0, line.childrenLength));
        }

        this._setLines(glyphs, lines);

        // cleaning up: remove unused lines from the end of this._scene
        lines = this._scene.children;
        for(i=lines.length-1;i>=0;i--) {
            line = lines[i];
            if(line.childrenLength)
                // no more unused lines
                break;
            this._scene.remove(line);
        }
    };
    */

    function manageLineBreaks (line, lines) {
        var found = null
          , i, l, newLine, children
          ;
        // don't check the last glyph, that's already covered
        // below we are only interested in "new" breaks
        // if a break would be at the end of the line, it would be
        // alright. Hence: l=line.childrenLength-1
        for(i=0,l=line.childrenLength-1;i<l;i++) {
            if(line.getChild(i).baseNode.id === 'br') {
                found = i;
                break;
            }
        }
        if(found === null)
            return;
        children = [];
        for(i=found+1,l=line.childrenLength;i<l;i++)
            children.push(line.getChild(i));
        newLine = new Line();
        newLine.splice(0,0, children);
        lines.unshift(newLine);
        if(line.parent)
            line.parent.splice(line.index + 1, 0, newLine);
        return true;
    }

    function getNextLine(scene, nextLines) {
        var line;
        if(!nextLines.length) {
            line = new Line();
            scene.add(line);
            nextLines.push(line);
        }
        return nextLines[0];
    }

    function getNextGlyph(lines) {
        var i, l;
        for(i=0,l=lines.length;i<l;i++)
            if(lines[i].childrenLength)
                return lines[i].getChild(0);
        return null;
    }

    /**
     * To obey the DRY principle it would be nice to consolidate the
     * this._setLines(glyphs) path and what this method does into a
     * set of common subroutines.
     *
     * Above, the old implementation did this by using `this._setLines`
     * However, it removed all glyphs from their lines and the reset them.
     * That turned out to be very expensive.
     *
     * This method tries to change only as much of the object model tree
     * as needed and is much faster.
     * But, since the execution paths are very different, we may end up
     * having different results between a fresh setting of all the lines
     * and a reflow. That would be bad.
     *
     * FIXME/TODO: the Apeirophobia Error of _setLines, it would be good
     * to detect that condition in here, too.
     */
    _p.reflow = function(firstLineIndex) {
        var lines = this._scene.children.slice(firstLineIndex || 0)
          , i, line
          , styleDict, maxLength
          , lastGlyph, nextLine = null, lineIsFull
          ;

        while( (line = lines.shift()) ) {
            manageLineBreaks(line, lines);

            styleDict = line.getComputedStyle();
            maxLength = styleDict.get('maxLength');
            if(styleDict.get('length', 0) > maxLength) {
                // remove last glyph and unshift it to the next line
                nextLine = null;
                do {
                    // What if line has no children? Is that an Apeirophobia error?
                    // only if there are glyphs left to be set.
                    if(!line.childrenLength) break;
                    lastGlyph = line.splice(line.childrenLength-1, 1)[0];
                    if(!nextLine)
                        nextLine = getNextLine(this._scene, lines);
                    nextLine.splice(0, 0, [lastGlyph]);
                } while(styleDict.get('length', 0) > maxLength);
            }
            else { // styleDict.get('length', 0) <= maxLength)
                // get next glyph and append it to this line
                lastGlyph = line.childrenLength && line.getChild(line.childrenLength-1);
                lineIsFull = lastGlyph && lastGlyph.baseNode.id === 'br';

                while( !lineIsFull && (lastGlyph = getNextGlyph(lines)) ) {
                    lineIsFull = this._set(line, lastGlyph, styleDict, maxLength);
                    lineIsFull = lineIsFull || lastGlyph.baseNode.id === 'br';
                }
                if(lastGlyph && !lastGlyph.parent) {
                    nextLine = getNextLine(this._scene, lines);
                    nextLine.splice(0, 0, [lastGlyph]);
                }
            }
        }

        // cleaning up: remove unused lines from the end of this._scene
        lines = this._scene.children;
        for(i=lines.length-1;i>=0;i--) {
            line = lines[i];
            if(line.childrenLength)
                // no more unused lines
                break;
            this._scene.remove(line);
        }
    };

    _p.shape = function(text) {
        var glyphs = []
          , lengths = this._fontBuilder.glyphCodesLengthList
          , i, l, len, token
          , index = 0
          , notDefGlyph
          ;

        tokenizer: while(index < text.length) {
            for(i=0,l=lengths.length;i<l;i++) {
                len = lengths[i];
                if(text.length < len)
                    continue;
                token = text.substr(index, len);
                if(!this._fontBuilder.has(token))
                    continue;
                glyphs.push(this._fontBuilder.getGlyphByCode(token));
                index += len;
                continue tokenizer;
            }
            if(!notDefGlyph)
                notDefGlyph = this._fontBuilder.getGlyphByCode(
                                            this._fontBuilder.notDefGlyph);
            // not found!
             glyphs.push(notDefGlyph);
             index += 1;

        }
        return glyphs;
    };

    _p.setScene = function(text) {
        var types, glyphs, newGlyphs, patch, firstLineIndex;
        if(!this._scene.childrenLength) {
            // initial
            glyphs = this.shape(text).map(this._cast, this);
            this._setLines(glyphs);
            return;
        }
        // update
        // there must be at least one line in the scene for this to work
        // but that's taken care of right above in the "initial" branch.
        this._scene.children.forEach(function(line){
            Array.prototype.push.apply(this, line.children);
        }, (types = []));
        glyphs = types.map(function(glyph){ return glyph.baseNode; });
        newGlyphs = this.shape(text);
        patch = diff.getPatchScript(glyphs, newGlyphs);
        firstLineIndex = this._applyPatch(patch, types);
        if(firstLineIndex !== null)
            this.reflow(firstLineIndex);
    };

    return SceneBuilder;
});

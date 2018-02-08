//jshint esversion:6
define([
    'BEF/errors'
  , 'BEF/BEOM/Line'
  , 'BEF/BEOM/Glyph'
  , 'BEF/diff'
], function(
    errors
  , Line
  , Glyph
  , diff
) {
    "use strict";

    var assert = errors.assert;

    function SceneBuilder(fontBuilder, scene) {
        this._fontBuilder = fontBuilder;
        this._scene = scene;
        this._leftOver = [];
    }

    var _p = SceneBuilder.prototype;

    _p._castAndInsert = function(line, idx, referenceGlyph) {
        var glyphInstance = line.addChild(referenceGlyph.pattern, idx);
        glyphInstance.setBaseInstances([referenceGlyph]);
        // TODO: the original code did clone classes and attachedData
        // from referenceGlyph. Do we need this here? we can just copy
        // them by hand to the instance. classes could indeed be helpful
        // for finer control in CPS, what is attachedData needed for though?
        // In the case of `attachedData`, the referenceGlyph is still
        // available via baseInstances, we can read it from there.

        // can't use the glyph id here, because there will be duplicates
        glyphInstance.setClass('ref_' + referenceGlyph.id);
        return glyphInstance;
    };

    _p._set = function(line, referenceGlyph, styleDict, maxLineLength) {
        var lineLength, glyphInstance;
        glyphInstance = this._castAndInsert(line, -1, referenceGlyph);
        lineLength = styleDict.get('length', 0);
        // TODO: add kerning?
        if(lineLength > maxLineLength) {
            line.removeChild(glyphInstance);
            return true;// line is full
        }
        return false;// line can try at least one more
    };

    _p._setLine = function(line, glyphs, index) {
        var consumed = 0, i, l, lineIsFull
            , styleDict = line.getComputedStyle()
             // To return +Infinity would be a good start for a never ending
             // spiral line. Just to keep the thought around somewhere.
            , maxLength = styleDict.get('maxLength')
            ;

        for(i=index,l=glyphs.length;i<l;i++) {
            lineIsFull = this._set(line, glyphs[i], styleDict, maxLength);
            if(lineIsFull)
                break;
            consumed += 1;
            if (glyphs[i].id === 'br')
                break;
        }

        return consumed;
    };

    _p._setLines = function(glyphs) {
        var i, l, line
          , consumed
          , glyphs_
          ;
        glyphs_ = glyphs.concat(this._leftOver);
        // this is for apeirophobia
        this._leftOver = [];

        for(i=0,l=glyphs_.length;i<l;/* i is increased by consumed */) {
            line = this._scene.addNewChild('line', -1);
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
        var i, l, cmd, line, glyphIndex
          , currentLine = null
          , offset = 0
          , firstLineIndex = null, idx, lineItemIndex
            // The indexes in types correspond to the indexes in the commands
            // of the patch script. We use them to find the right line to
            // operate on and an offset from glyph indexes to line indexes.
          , lineData = types.map(glyph => [glyph.parent, glyph.index])
          ;

        for(i=0,l=script.length;i<l;i++) {
            cmd = script[i];
            // this happens if the an insert appends to the end
            lineItemIndex = lineData.length === cmd[1] ? cmd[1]-1 : cmd[1];

            [line, glyphIndex] = lineData[lineItemIndex];
            if(line !== currentLine) {
                // The line changed. recalculate the offset of the command
                // indexes to the line indexes
                offset = glyphIndex - lineItemIndex;
                currentLine = line;
                if(firstLineIndex === null)
                    // all lines from this on will have to reflow
                    firstLineIndex = line.index;
            }

            idx = cmd[1] + offset;
            if(cmd[0]==='D') {
                // !! no, do this via pattern!
                line.pattern.removeAt(idx, 1);
                offset -= 1;
            }
            else if (cmd[0] === 'I') {
                this._castAndInsert(line, idx, cmd[2]);
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

    NOTE: _setLines doesn't use the `lines` argument anymore

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

    function isLineBreak(glyph) {
        return glyph.baseInstances[0].id === 'br';
    }

    function manageLineBreaks (line, lines) {
        var found = null
          , i, l, newLine, amount
          ;
        // don't check the last glyph, that's already covered
        // below we are only interested in "new" breaks
        // if a break would be at the end of the line, it would be
        // alright. Hence: l=line.childrenLength-1
        for(i=0,l=line.childrenLength-1;i<l;i++) {
            if(isLineBreak(line.getChild(i))) {
                found = i;
                break;
            }
        }
        if(found === null)
            return;
        //children = []
        amount = line.childrenLength - found;
        newLine = line.parent.addNewChild('line', line.index + 1);
        moveInstances(line, found, amount, newLine, 0);
        // prepend new line to the beginning of lines ...
        lines.unshift(newLine);
        return true;
    }

    function getNextLine(scene, nextLines) {
        var line;
        if(!nextLines.length) {
            line = scene.addNewChild('line', - 1);
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
     * This is a generally useful function, should be in some kind of
     * standard lib.
     *
     * NOTE: that move manipulates the pattern trees!
     */
    function moveInstances(oldParent, oldStartIndex, amount, newParent, newStartIndex) {
        var oldInstances = oldParent.children.slice(oldStartIndex, oldStartIndex + amount)
          , patterns = oldInstances.map(i=>i.pattern)
          , instancesData
          , newIndex, newInstances
          ;

        // START get instanceData
        instancesData = oldInstances.map(startInstance => {
            var data = Object.create(null);
            startInstance.walkTreeDepthFirst(instance => {
                data[instance.getIndexPath(startInstance)] = instance.data;
            });
            return data;
        });
        // END get instanceData

        oldParent.pattern.removeAt(oldStartIndex, oldInstances.length);
        newIndex = newParent.pattern.insertAt(newStartIndex, patterns);
        newInstances = newParent.children.slice(newIndex, newIndex + oldInstances.length);

        // START set instanceData
        function _setData(data, startInstance, instance) {
            var instanceData = data[instance.getIndexPath(startInstance)];
            // We just captured the instanceDatait from the same pattern:
            assert(!!instanceData, 'InstanceData must exist here!');
            instance.loadData(instanceData);
        }

        for(let i=0,l=instancesData.length;i<l;i++) {
            let data = instancesData[i]
              , startInstance = newInstances[i]
              , setData = _setData.bind(null, data, startInstance)
              ;
            startInstance.walkTreeDepthFirst(setData);
        }
        // END set instanceData
        return newInstances;
    }

    function moveInstance(oldParent, oldIndex, newParent, newIndex) {
        return moveInstances(oldParent, oldIndex, 1, newParent, newIndex)[0];
    }

    function removeEmptyLines (scene) {
        // cleaning up: remove unused lines from the end of this._scene
        var lines = scene.children
          , deleteCount = 0
          , startIndex
          , i, line
          ;
        for(i=lines.length-1;i>=0;i--) {
            line = lines[i];
            if(line.childrenLength)
                // no more unused lines
                break;
            deleteCount += 1;
            startIndex = i;
        }
        if(deleteCount)
            scene.pattern.removeAt(startIndex, deleteCount);
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
          , line
          , styleDict, maxLength
            // uses styleDict and maxLength from this closure
          , checkLineIsFull = () => styleDict.get('length', 0) > maxLength
          , nextLine = null, lineIsFull
          ;
        while( (line = lines.shift()) ) {
            manageLineBreaks(line, lines);
            styleDict = line.getComputedStyle();
            maxLength = styleDict.get('maxLength');

            if(checkLineIsFull()) {
                // remove last glyphs and unshift to the next line
                nextLine = null;
                do {
                    // What if line has no children? Is that an Apeirophobia error?
                    // only if there are glyphs left to be set.
                    if(!line.childrenLength) break;
                    if(!nextLine)
                        nextLine = getNextLine(line.parent, lines);
                    // from the end of line to the start of nextLine;
                    moveInstance(line, line.childrenLength - 1, nextLine, 0);
                } while(checkLineIsFull());
            }
            else { // styleDict.get('length', 0) <= maxLength)
                // get next glyphs and append to this line
                let lastGlyph = line.childrenLength && line.getChild(line.childrenLength-1);
                // this is true because styleDict.get('length', 0) <= maxLength)
                // thus this line is only full if lastGlyph is a line break
                lineIsFull = lastGlyph && isLineBreak(lastGlyph);
                while( !lineIsFull && (lastGlyph = getNextGlyph(lines)) ) {
                    let movedGlyph = moveInstance(
                            lastGlyph.parent, lastGlyph.index, line, -1);
                    lineIsFull = checkLineIsFull();
                    if(lineIsFull) {
                        // move back, will be used in next iteration
                        nextLine = getNextLine(line.parent, lines);
                        moveInstance(
                            movedGlyph.parent, movedGlyph.index, nextLine, 0);
                    }
                    else
                        // inserted a line break
                        lineIsFull = isLineBreak(lastGlyph);
                }
            }
        }
        removeEmptyLines(this._scene);
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
            glyphs = this.shape(text);
            this._setLines(glyphs);
            return;
        }
        // update
        // there must be at least one line in the scene for this to work
        // but that's taken care of right above in the "initial" branch.

        types = [];
        this._scene.children.forEach(line => types.push(...line.children));
        glyphs = types.map(glyph => glyph.baseInstances[0]);

        newGlyphs = this.shape(text);
        patch = diff.getPatchScript(glyphs, newGlyphs);
        firstLineIndex = this._applyPatch(patch, types);
        if(firstLineIndex !== null)
            this.reflow(firstLineIndex);
    };

    return SceneBuilder;
});

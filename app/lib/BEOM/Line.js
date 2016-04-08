define([
    './_Node'
  , './Glyph'
], function(
    Parent
  , Glyph
) {
    "use strict";

    function Line() {
        Parent.call(this);
    }
    var _p = Line.prototype = Object.create(Parent.prototype);
    _p.constructor = Line;

    Object.defineProperty(_p, 'type', {
        value: 'line'
    });

    _p._acceptedChildren = Object.create(null);
    _p._acceptedChildren[Glyph.prototype.type] = Glyph;

    return Line;
});

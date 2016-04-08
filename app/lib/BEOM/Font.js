define([
    './_Node'
  , './Glyph'
], function(
    Parent
  , Glyph
) {
    "use strict";

    function Font() {
        Parent.call(this);
    }
    var _p = Font.prototype = Object.create(Parent.prototype);
    _p.constructor = Font;

    Object.defineProperty(_p, 'type', {
        value: 'font'
    });

    Object.defineProperty(_p, 'idManager', {
        value: true
    });

    _p._acceptedChildren = Object.create(null);
    _p._acceptedChildren[Glyph.prototype.type] = Glyph;

    return Font;
});

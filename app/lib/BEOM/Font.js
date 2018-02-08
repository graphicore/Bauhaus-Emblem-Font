//jshint esversion:6
define([
    './_Node'
  , './Glyph'
], function(
    Parent
  , Glyph
) {
    "use strict";

    function Font(...args) {
        Parent.call(this,...args);
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

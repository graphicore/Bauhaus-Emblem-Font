define([
    // Parent
    './_Node'
  , './Scene'
  , './Font'
], function(
    Parent
  , Scene
  , Font
) {
    "use strict";

    function Root(font /* optional */, scene /* optional */) {
        Parent.call(this, font, scene);
        Object.freeze(this._children);
    }
    var _p = Root.prototype = Object.create(Parent.prototype);
    _p.constructor = Root;

    Root.$frozenChildren = ['scene', 'font'];

    function factory(controller, scene, font) {
        return new Root(controller, scene, font);
    }
    Root.factory = factory;

    Object.defineProperty(_p, 'type', {
         /* this is used for CPS selectors*/
         value: 'root'
    });

    _p._acceptedChildren = Object.create(null);
    _p._acceptedChildren[Scene.prototype.type] = Scene;
    _p._acceptedChildren[Font.prototype.type] = Font;

    _p._cps_getters = {
        scene: ['instance', 'getChild', 0]
      , font: ['instance', 'getChild', 1]
    };

    //inherit from parent
    (function(source) {
        for(var k in source) if(!this.hasOwnProperty(k)) this[k] = source[k];
    }).call(_p._cps_getters, Parent.prototype._cps_getters);

    Object.defineProperty(_p, 'scene', {
        get: function() {
            return this._children[0];
        }
    });

    Object.defineProperty(_p, 'font', {
        get: function() {
            return this._children[1];
        }
    });

    return Root;
});

define([
    'Atem-CPS/OMA/_Root'
  , './Scene'
  , './Font'
], function(
    Parent
  , Scene
  , Font
) {
    "use strict";

    function Root(controller, font /* optional */, scene /* optional */) {
        Parent.call(this, controller);

        this.add(scene || new Scene()); // 0
        this.add(font || new Font()); // 1
        Object.freeze(this._children);
    }
    var _p = Root.prototype = Object.create(Parent.prototype);
    _p.constructor = Root;

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

    _p._cps_whitelist = {
        scene: 'scene'
      , font: 'font'
    };

    //inherit from parent
    (function(source) {
        for(var k in source) if(!this.hasOwnProperty(k)) this[k] = source[k];
    }).call(_p._cps_whitelist, Parent.prototype._cps_whitelist);

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

    _p.clone = function(cloneElementProperties) {
        var clone = new this.constructor(this._controller
                            , this.scene.clone(cloneElementProperties)
                            );
        this._cloneProperties(clone, cloneElementProperties);
        return clone;
    };

    return Root;
});

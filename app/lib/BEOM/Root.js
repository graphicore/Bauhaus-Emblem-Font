define([
    // Parent
    './_Node'
    // Root.prototype as a mixin
  , 'Atem-CPS/OMA/_Root'
  , './Scene'
  , './Font'
], function(
    Parent
  , OMARoot
  , Scene
  , Font
) {
    "use strict";

    function Root(controller, font /* optional */, scene /* optional */) {
        Parent.call(this);
        this._controller = controller;

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

    // mixin Root.prototype
    (function(source, target) {
            //  enumerable and non-enumerable properties found directly upon
        var props = Object.getOwnPropertyNames(source)
          , i, l, k, prop
          ;
        for(i=0,l=props.length;i<l;i++) {
            k = props[i];
            if(target.hasOwnProperty(k))
                // don't override properties defined in here.
                continue;

            prop = Object.getOwnPropertyDescriptor(source, k);
            Object.defineProperty(target, k, prop);
        }
    })(OMARoot.prototype, _p);
    return Root;
});

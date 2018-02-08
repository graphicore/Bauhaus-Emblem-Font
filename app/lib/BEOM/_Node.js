//jshint esversion:6
define([
    'BEF/errors'
  , 'Atem-CPS/OMA/_Node'
  , 'Atem-Math-Tools/Vector'
  , 'BEF/cpsTools'
], function(
    errors
  , Parent
  , Vector
  , cpsTools
) {
    "use strict";
    var ValueError = errors.Value;

    function _Node(...args) {
        //jshint validthis:true
        Parent.call(this, ...args);
    }
    var _p = _Node.prototype = Object.create(Parent.prototype);
    _p.constructor = _Node;

    _p._validators = null;

    _p._getValidator = function(key) {
        if( this._validators && key in this._validators )
            return this._validators[key];
        return null;
    };

    Object.defineProperty(_p, 'makeProperty', {
        value: cpsTools.makeProperty
    });

    _p.loadData = function(data) {
        this._loadData(this.makeProperty, data);
    };

    // common validator functions are shared here
    function validateVector(key, value) {
        //jshint validthis:true
        if(!(value instanceof Vector))
            throw new ValueError('The value of "' + key +'" '
                            + 'must be a Vector, got: "'+ value
                            + '" typeof ' +  typeof value + ' in ' + this);
        return value;
    }
    _Node.validateVector = validateVector;
    function validateNumber(key, value) {
        //jshint validthis:true
        if(typeof value !== 'number' || value !== value)
            throw new ValueError('The value of "' + key +'" '
                + 'must be a number, got: '
                + (value !== value
                    ? ' NaN (happens with division by 0 for example)'
                    : '"'+ value + '" typeof: ' +  typeof value
                        + (value && typeof value.constructor === 'function'
                                ? ' a: ' + value.constructor.name
                                : ''
                        )
                )
                + ' in ' + this
            );
        return value;
    }
    _Node.validateNumber = validateNumber;

    _p._getFromBaseInstances = function(instance, index){
        return instance.baseInstances[index];
    };

    _p._cps_getters = {
        // this works if the instance is a child of a line, because
        // we set one baseInstance there.
        baseNode: ['this', '_getFromBaseInstances', 0]
    };

    //inherit from parent
    (function(source) {
        for(var k in source) if(!this.hasOwnProperty(k)) this[k] = source[k];
    }).call(_p._cps_getters, Parent.prototype._cps_getters);

    return _Node;
});

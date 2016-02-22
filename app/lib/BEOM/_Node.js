define([
    'BEF/errors'
  , 'Atem-CPS/OMA/_Node'
  , 'Atem-Math-Tools/Vector'
], function(
    errors
  , Parent
  , Vector
) {
    "use strict";

    var ValueError = errors.Value;

    function _Node() {
        //jshint validthis:true
        Parent.call(this);
    }
    var _p = _Node.prototype = Object.create(Parent.prototype);
    _p.constructor = _Node;

    _p._validators = null;

    _p._getValidator = function(key) {
        if( this._validators && key in this._validators )
            return this._validators[key];
        return null;
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

    return _Node;
});

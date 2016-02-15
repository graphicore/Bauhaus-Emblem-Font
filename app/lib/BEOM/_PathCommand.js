define([
  , 'BEF/errors'
  , 'Atem-CPS/OMA/_Node'
] function(
    Parent
  , errors
) {
    "use strict";

    var BEOMError = errors.BEOM;

    function _PathCommand() {
        Parent.call(this);
        if(this.constructor.prototype === _p)
            throw new BEOMError('BEOM _PathCommand must not be instantiated '
                                +'directly');
    }
    var _p = _PathCommand.prototype = Object.create(Parent.prototype);
    _p.constructor = _PathCommand;


    return _PathCommand;
});

define([
    'BEF/errors'
  , './_Node'
], function(
    errors
  , _Node
) {
    "use strict";

    var ValueError = errors.Value
      , Parent = _Node
      ;

    function Command() {
        Parent.call(this);
    }
    var _p = Command.prototype = Object.create(Parent.prototype);
    _p.constructor = Command;

    _p._validators = Object.create(null);
    function cmdValidator(key, command) {
        //jshint validthis:true
        var commands = {'lineTo':1, 'curveTo':1, 'arcTo':1, 'moveTo':1, 'close':1};
        if(typeof command !== 'string')
                        throw new ValueError('The value of "' + key +'" '
                            + 'must be a Singtr, got: "'+ command
                            + '" typeof ' +  typeof command + ' in ' + this);
        if(!(command in commands))
            throw new ValueError('The value of "' + key +'" '
                                + 'must be a path command, got:"' + command
                                + '" in ' + this);
        return command;
    }

    _p._validators.cmd = cmdValidator;

    _p._validators.ctrl1 = _p._validators.ctrl2 = _p._validators.coord = _Node.validateVector;
    _p._validators.rx = _p._validators.ry = _Node.validateNumber;
    _p._validators.ellipseRotation = _p._validators.rx = _Node.validateNumber;

    _p._validators.largeArcFlag = function(key, value) {
        value = _Node.validateNumber(key, value);// number
        // postprocessing is allowed
        return value && 1; //0 or 1;
    };
    _p._validators.largeArcFlag = _p._validators.sweepFlag;

    Object.defineProperty(_p, 'type', {
        value: 'command'
    });

    return Command;
});

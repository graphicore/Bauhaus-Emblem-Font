define([
    'BEF/errors'
  , 'yaml'
  , 'Atem-CPS/CPS/cpsTools'
  , 'BEF/BEOM/MoveToCommand'
  , 'BEF/BEOM/LineToCommand'
  , 'BEF/BEOM/ArcToCommand'
  , 'BEF/BEOM/CloseCommand'
], function(
    errors
  , yaml
  , cpsTools
  , MoveToCommand
  , LineToCommand
  , ArcToCommand
  , CloseCommand
) {
    "use strict";

    var FontError = errors.Font
      , KeyError = errors.Key
      , setProperties = cpsTools.setProperties
      ;

    function Font(glyphData) {
        this._glyphData = glyphData;
        this._glyphCodesLengthList = null;

        if(!this.has(this.notDefGlyph))
            throw new FontError('Missing glyph: NotDefGlyph called: "'+this.notDefGlyph+'".');
    }

    var _p = Font.prototype;
    _p.cosntructor = Font;

    function fromYAML(str) {
        var glyphData = yaml.safeLoad(str);
        return new Font(glyphData);
    }
    Font.fromYAML = fromYAML;

    Object.defineProperty(_p, 'notDefGlyph', {
        value: '.ndef'
    });

    Object.defineProperty(_p, 'glyphCodesLengthList', {
        get: function() {
            var k, l, list, members;
            if(this._glyphCodesLengthList === null) {
                list = this._glyphCodesLengthList = [];
                members = new Set();
                for(k in this._glyphData) {
                    l = k.length;
                    if(members.has(l))
                        continue;
                    members.add(l);
                    list.push(l);
                }
                list.sort();
            }
            return this._glyphCodesLengthList;
        }
    });

    _p.has = function(glyphCode) {
        return glyphCode in this._glyphData;
    };

    _p._commandFactories = Object.create(null);
    _p._commandFactories.moveTo = MoveToCommand;
    _p._commandFactories.lineTo = LineToCommand;
    _p._commandFactories.arcTo = ArcToCommand;
    _p._commandFactories.close = CloseCommand;

    _p._makeCommand = function(data) {
        var name = data[0]
          , properties = data[1]
          , Factory = this._commandFactories[name]
          , command
          ;
        if(!Factory)
            throw new KeyError('Command-factory missing for "' + name + '"');

        command = new Factory();
        if(properties)
            setProperties(command.properties, properties);

        return command;
    };

    _p.drawGlyph = function(glyphCode, glyph) {
        var data, i,l, command;
        if(!this.has(glyphCode))
            throw new KeyError('Glyph missing for "' + glyphCode + '"');
        data = this._glyphData(glyphCode);

        if(data.properties)
            // TODO: there are some needed properties, like
            // width, before, after
            // maybe we can define defaults for these? so a glyph
            // not defining them is not invalid?
            // Also, there will be some custom named points on the grid,
            // to be used by the commands. We'll also have some font-wide
            // defaults
            // Maybe the font should bring an own default cps?
            //
            // Also, find good reasons why some parts are in font.cps
            // and why some parts are properties. The reasoning is yet not
            // clear. I expect it becoming more obvious what to do when
            // I can toy around a bit.
            setProperties(glyph.properties, data.properties);

        if(data.classes)
            for(i=0,l=data.classes.length;i<l;i++)
                glyph.setClass(data.classes[i]);

        if(!data.commands)
            return;
        for(i=0,l=data.commands.length;i<l;i++) {
            command = this._makeCommand(data.commands[i]);
            glyph.add(command);
        }
    };

    return Font;
});

define([
    'BEF/errors'
  , 'yaml'
  , 'BEF/cpsTools'
  , 'BEF/BEOM/Glyph'
  , 'BEF/BEOM/Command'
], function(
    errors
  , yaml
  , cpsTools
  , Glyph
  , Command
) {
    "use strict";

    var FontError = errors.Font
      , KeyError = errors.Key
      , setProperties = cpsTools.setProperties
      ;

    function FontBuilder(font, fontData) {
        this._fontData = fontData;
        this._glyphData = fontData.glyphs;
        this._glyphCodesLengthList = null;
        this._font = font;

        if(!this.has(this.notDefGlyph))
            throw new FontError('Missing glyph: NotDefGlyph called: "'+this.notDefGlyph+'".');

        this._drawFont();
    }

    var _p = FontBuilder.prototype;
    _p.cosntructor = FontBuilder;

    function fromYAML(font, str) {
        var fontData = yaml.safeLoad(str);
        return new FontBuilder(font, fontData);
    }
    FontBuilder.fromYAML = fromYAML;

    Object.defineProperty(_p, 'notDefGlyph', {
        value: 'notDef'
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
                list.sort().reverse();
            }
            return this._glyphCodesLengthList;
        }
    });

    _p.has = function(glyphCode) {
        return glyphCode in this._glyphData;
    };

    _p.getId = function(glyphCode) {
        var id;
        if(!this.has(glyphCode))
            throw new KeyError('Glyph missing for "' + glyphCode + '"');

        id = this._glyphData[glyphCode].id;
        if(!id)
            throw new FontError('Glyph for glyphCode "' + glyphCode
                                + '" has no id');
        return id;
    };

    _p.getGlyphByCode = function(glyphCode) {
        var id = this.getId(glyphCode);
        // TODO: It's about time to build this.
        return this._font.getById(id);
    };

    _p._setDataToNode = function(node, data) {
        var id = data.id
          , properties = data.properties
          , classes = data.classes
          ;
        if(id)
            node.id = id;

        if(properties)
            setProperties(node.properties, properties);

        if(classes)
            node.setClasses(classes);

    };

    _p._makeCommand = function(data) {
        var command = new Command();
        this._setDataToNode(command, data);
        return command;
    };

    _p._makeGlyph = function(glyphCode) {
        var glyph, data, i,l, command;
        if(!this.has(glyphCode))
            throw new KeyError('Glyph missing for "' + glyphCode + '"');

        glyph = new Glyph();
        data = this._glyphData[glyphCode];

        // TODO: there are some needed properties, like
        // width, before, after
        // maybe we can define defaults for these? so a glyph
        // not defining them is not invalid?
        // Also, there will be some custom named points on the grid,
        // to be used by the commands. We'll also have some font-wide
        // defaults
        // Maybe the font should bring an own default cps?
        // OR we just put the font defaults into the font properties
        // now that there is a font node.
        //
        // Also, find good reasons why some parts are in font.cps
        // and why some parts are properties. The reasoning is yet not
        // clear. I expect it becoming more obvious what to do when
        // I can toy around a bit.
        this._setDataToNode(glyph, data);

        if(data.children) for(i=0,l=data.children.length;i<l;i++) {
            command = this._makeCommand(data.children[i]);
            glyph.add(command);
        }

        return glyph;
    };

    _p._drawFont = function() {
        var glyphCode, glyph;

        this._setDataToNode(this._font, this._fontData);
        for (glyphCode in this._glyphData) {
            // FIXME: if the glyph at glyphCode has no id it should be
            // skipped and a warning should be issued.
            // This must also be considered by the "has" method. So
            // maybe we should sanitize this._glyphData on load and warn
            // there.
            // Later in the program the getId method will throw FontError
            // if there are glyphs without ids.
            glyph = this._makeGlyph(glyphCode);
            this._font.add(glyph);
        }
    };

    return FontBuilder;
});

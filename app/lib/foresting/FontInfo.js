//jshint esversion: 6
define([
    'BEF/errors'
  , 'yaml'
  , 'BEF/cpsTools'
], function(
    errors
  , yaml
  , cpsTools
) {
    "use strict";

    var FontError = errors.Font
      , KeyError = errors.Key
      , GlyphIDMissingError = errors.GlyphIDMissing
      , setProperties = cpsTools.setProperties
      ;

    var Builder = (function() {
        /**
         * Build a BEOM font from a YAML format that is a bit friendlier
         * to hand-edit.
         */
        function FontBuilder(font, fontData, notDefGlyph) {
            this._font = font;
            this._fontData = fontData;
            this._glyphData = fontData.glyphs;
            if(!this.has(notDefGlyph))
            throw new FontError('Missing glyph: NotDefGlyph called: "'
                                            + notDefGlyph + '".');
            this._drawFont();
        }
        var _p = FontBuilder.prototype;
        _p.constructor = FontBuilder;

        _p.has = function(glyphCode) {
            return glyphCode in this._glyphData;
        };

        _p._setDataToInstance = function(instance, data) {
            var id = data.id
              , properties = data.properties
              , classes = data.classes
              ;

            if(id)
                instance.id = id;

            if(properties)
                setProperties(instance.properties, properties);

            if(classes)
                instance.setClasses(classes);
        };

        _p._setDataToGlyphInstance = function(instance, glyphCode, data) {
            if(!data.id)
                throw new GlyphIDMissingError('Glyph id for glyph code "' + glyphCode
                                                        + '" is missing.');
            instance.attachData('glyphCode', glyphCode);
            this._setDataToInstance(instance, data);
        };

        _p._addCommand = function(glyphInstance, data) {
            var commandInstance = glyphInstance.addNewChild('command', -1);
            this._setDataToInstance(commandInstance, data);
            return commandInstance;
        };

        _p._addGlyph = function(fontInstance, glyphCode, data) {
            var glyphInstance = fontInstance.addNewChild('glyph', -1)
              , i,l
              ;
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
            this._setDataToGlyphInstance(glyphInstance, glyphCode, data);

            if(data.children) for(i=0,l=data.children.length;i<l;i++)
                this._addCommand(glyphInstance, data.children[i]);

            return glyphInstance;
        };

        _p._drawFont = function() {
            var glyphCode;
            this._setDataToInstance(this._font, this._fontData);
            for (glyphCode in this._glyphData) {
                try {
                    this._addGlyph(this._font, glyphCode, this._glyphData[glyphCode]);
                }
                catch(error) {
                    if(!(error instanceof GlyphIDMissingError))
                        throw error;
                    else
                        // If the glyph at glyphCode has no id it is
                        // skipped and a warning is issued.
                    console.warn(error);
                    continue;
                }
            }
        };

        return FontBuilder;
    })();

    function FontInfo(font) {
        this._font = font;
        this._glyphCodesLengthList = null;

        this._glyphCodeToID = this._buildGlyphCodeToID();

        if(!this.has(this.notDefGlyph))
            throw new FontError('Missing glyph: NotDefGlyph called: "'
                                            + this.notDefGlyph + '".');
    }

    // FIXME: it seems better to implement these as part of the BEOM-Font class.
    var _p = FontInfo.prototype;
    _p.cosntructor = FontInfo;

    function fromYAML(font, str) {
        var fontData = yaml.load(str);
        new Builder(font, fontData, FontInfo.prototype.notDefGlyph);
        return new FontInfo(font);
    }
    FontInfo.fromYAML = fromYAML;

    _p._buildGlyphCodeToID = function() {
        var data = Object.create(null)
          , l = this._font.childrenLength
          , glyph, i
          ;
        for(i=0;i<l;i++) {
            glyph = this._font.getChild(i);
            data[glyph.getAttachment('glyphCode')] = glyph.id;
        }
        return data;
    };

    Object.defineProperty(_p, 'notDefGlyph', {
        value: 'notDef'
    });

    Object.defineProperty(_p, 'glyphCodesLengthList', {
        get: function() {
            var k, l, list, members;
            if(this._glyphCodesLengthList === null) {
                list = this._glyphCodesLengthList = [];
                members = new Set();
                for(k in this._glyphCodeToID) {
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
        return glyphCode in this._glyphCodeToID;
    };

    _p.getId = function(glyphCode) {
        var id;
        if(!this.has(glyphCode))
            throw new KeyError('Glyph missing for "' + glyphCode + '"');

        id = this._glyphCodeToID[glyphCode];
        if(!id)
            throw new FontError('Glyph for glyphCode "' + glyphCode
                                + '" has no id');
        return id;
    };

    _p.getGlyphByCode = function(glyphCode) {
        var id = this.getId(glyphCode);
        return this._font.getById(id);
    };

    return FontInfo;
});

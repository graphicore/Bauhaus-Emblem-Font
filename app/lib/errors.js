define([
    'Atem-Errors/errors'
], function(
    atemErrors
) {
    var errors = Object.create(atemErrors)
      , makeError = atemErrors.makeError.bind(null, errors)
      ;

    makeError('BEOM', undefined, errors.Error);
    makeError('Font', undefined, errors.BEOM);
    makeError('GlyphIDMissing', undefined, errors.Font);

    makeError('CPSUI', undefined, errors.Error);


    return errors;
});

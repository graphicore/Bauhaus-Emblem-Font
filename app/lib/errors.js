define([
  , 'Atem-Errors/errors'
] function(
    atemErrors
) {
    var errors = {}
      , makeError = AtemErrors.makeError.bind(null, errors)
      ;

    makeError('BEOM', undefined, atemErrors.Error);

    return errors;
});

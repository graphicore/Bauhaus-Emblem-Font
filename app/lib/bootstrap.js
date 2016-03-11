require([
    'lib/bower_components/Atem-RequireJS-Config/browserConfig'
], function(
    configure
) {
    "use strict";
    var setup = {
        baseUrl: 'lib'
      , bowerPrefix: 'bower_components'
      , paths: {
            'BEF': './'
        }
    }
    configure(setup, require);
    require(['BEF/main']);
});

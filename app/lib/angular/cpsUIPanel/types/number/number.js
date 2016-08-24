define([
    'angular'
  , './number-controller'
  , './number-directive'
], function(
    angular
  , Controller
  , directive
) {
    "use strict";
    return angular.module('cpsUINumber', [])
      .controller('CPSUINumberController', Controller)
      .directive('mtkCpsUiNumber', directive)
      ;
});

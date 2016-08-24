define([
    'angular'
  , './string-controller'
  , './string-directive'
], function(
    angular
  , Controller
  , directive
) {
    "use strict";
    return angular.module('cpsUIString', [])
      .controller('CPSUIStringController', Controller)
      .directive('mtkCpsUiString', directive)
      ;
});

define([
    'BEF/errors'
  , 'require/domReady'
  , 'Atem-IO/io/static'
  , 'Atem-IO/io/InMemory'
  , 'Atem-IO/io/Mounting'
  , 'Atem-IO/tools/zipUtil'
  , 'Atem-IO/tools/readDirRecursive'
  , 'CPSController'
  , 'Atem-CPS/CPS/RuleController'
  , 'Atem-CPS/CPS/SelectorEngine'
  , 'Atem-Pen-Case/pens/SVGPen'
  , 'BEF/BEOM/Root'
  , 'BEF/foresting/SceneBuilder'
  , 'BEF/foresting/FontInfo'
  , 'angular'
  , 'BEF/angular/app'
  , 'Atem-CPS-Toolkit/services/dragAndDrop/DragDataService'
  , 'Atem-CPS-Toolkit/services/dragAndDrop/DragIndicatorService'
  , './cpsTools'
  , 'yaml'
], function(
    errors
  , domReady
  , staticIO
  , InMemoryIO
  , MountingIO
  , zipUtil
  , readDirRecursive
  , CPSController
  , RuleController
  , SelectorEngine
  , SVGPen
  , Root
  , SceneBuilder
  , FontInfo
  , angular
  , angularApp
  , DragDataService
  , DragIndicatorService
  , cpsTools
  , yaml
) {
    "use strict";
    /* globals setTimeout, clearTimeout */
    var svgns = 'http://www.w3.org/2000/svg'
      , ValueError = errors.Value
      ;

    // monkeypatching, arcto, it's not an original part of the pen protocol
    // I could add it to svg pen anyways. It's in SVG, so it's ok when
    // the SVG pen has it. And it stays compatible with the protocol.

    SVGPen.prototype.arcTo = function(pt, r1, r2, angle, largeArcFlag, sweepFlag) {
            var segment = ['A', r1, r2, angle, largeArcFlag ? '1' : '0',
                           sweepFlag ? "1" : "0" , pt[0], pt[1]
            ].join(' ');
            this._addSegment(segment);
            this.__currentPoint = pt;
    };

    function degree(theta) {
        return theta * 180 / Math.PI;
    }

    function drawGlyph(glyph, pen) {
        var i, l
          , commands = glyph.children
          , command, styleDict, rx
          ;

        for(i=0,l=commands.length;i<l;i++) {
            command = commands[i];
            styleDict = command.getComputedStyle();
            switch(styleDict.get('cmd')) {
                case 'lineTo':
                    // function could be configured in cps
                    // we'd need here a whitelist for allowed calls
                    // allowed calls we be validated
                    // also all the arguments used here!

                    // plus for each allowed call a method that gathers
                    // the args from CPS, defaulting if possible to something
                    // usable, like 0 for not set flags.
                    // also args could be a List in CPS
                    pen.lineTo(styleDict.get('coord').valueOf());
                    break;
                case 'curveTo':
                    // function could be configured in cps
                    // we'd need here a whitelist for allowed calls
                    // plus for each allowed call a method that gathers
                    // the args from CPS, defaulting if possible to something
                    // useable, like 0 for not set flags.
                    // also args could be a List in CPS
                    pen.lineTo(styleDict.get('ctrl1').valueOf(), styleDict.get('ctrl2').valueOf(), styleDict.get('coord').valueOf());
                    break;
                case 'arcTo':
                    rx = styleDict.get('rx');
                             // The absolute X/Y coordinate vector for the
                             // end point of this path segment.
                    pen.arcTo(styleDict.get('coord').valueOf()
                             // The x-axis radius for the ellipse (i.e., r1).
                           , rx
                             // The y-axis radius for the ellipse (i.e., r2).
                           , styleDict.get('ry', rx)
                            // The rotation angle in **degrees** for the ellipse's
                            // x-axis relative to the x-axis of the user
                            // coordinate system.
                            // we won't need to write this often, I expect,
                            // so I opt for a very descriptive name
                            // Ellipses are untried yet anyways and won't
                            // be part of the initial offer.
                           , degree(styleDict.get('ellipseRotation', 0))
                           // The value of the large-arc-flag parameter.
                           , styleDict.get('largeArcFlag', 0)
                           //  The value of the sweep-flag parameter.
                           , styleDict.get('sweepFlag', 0)
                    );
                    break;
                case 'moveTo':
                    pen.moveTo(styleDict.get('coord').valueOf());
                    break;
                case 'close':
                    pen.closePath();
                    break;
                default:
                    throw new ValueError('Unknown command type: ' + command.type);
            }
        }
        pen.endPath();
    }

    function drawLine (line, container) {
        var i, l, path, pen, glyph, styleDict//, verticalStart
          , glyphs = line.children
          ;
        for(i=0,l=glyphs.length;i<l;i++) {
            path = container.ownerDocument.createElementNS(svgns, 'path');
            pen = new SVGPen(path, {});
            glyph = glyphs[i];
            styleDict = glyph.getComputedStyle();
            drawGlyph(glyph, pen);
            container.appendChild(path);
        }
    }

    function drawScene (scene, container) {
        var lineElement, i, l
          , lines = scene.children
          ;
        for(i=0,l=lines.length;i<l;i++) {
            lineElement = container.ownerDocument.createElementNS(svgns, 'g');
            drawLine(lines[i], lineElement);
            container.appendChild(lineElement);
        }
    }

    var rootDir = 'data/'
      , cpsLibIoMounts = [
            // add more of these configuration objects to include more
            // libraries each object yields in a call to MountingIO.mount
            // the keys correlate with the argument names of MountingIO
            // however, Project does some augmentation.
            {
                  io: staticIO
                , mountPoint: 'lib/std'
                , pathOffset: rootDir+ 'lib/cpsLib'
            }
        ];

    var cpsFile = 'main.cps'
      , cpsDir = 'cps'
      ;
    // function getIO() {
    //     var io = new InMemoryIO();
    //     io.mkDir(false, 'cps');
    //     // this creates a copy
    //     io.writeFile(false, 'cps/'+cpsFile,
    //                     staticIO.readFile(false, 'project/cps/' + cpsFile));
    //     return io;
    // }

    // Create a new, empty project
    function newProject() {
        // TODO: I think this should copy the cpsLib/initialProject/main.cps file and
        // put it to a writable location.
        // It's kind of strange, not to have a useable cps file with a
        // new project.
        // Maybe we could have a whole initial directory to be copied.
                // I think this should go into  new RuleController! Do I?
        // getIO used to do this
        var io = new InMemoryIO() // we'll save to this
          , project
          ;
        io.ensureDirs(false, cpsDir);
        staticIO.copyRecursive(false, rootDir+'lib/cpsLib/initialProject', /* to: */ io, cpsDir);

        // assert file exists cpsDir + '/main.cps'
        project = new Project(io, cpsDir, cpsFile);
        project.init();
        return project;
        // current project dir:
        // projectio/
        //      cps/
        //          main.cps
        //      font.yaml
        //
        // Intermediately it would be indeed easier to have the font as a
        // part of project.yaml, because, without metacomponents it's not
        // normalized (like databse normalized) anyways.
        // Then:
        // projectio/
        //      project.yaml
        //      cps/
        //          main.cps # could be anywhere though, but this is the default
        //          ... # more cps files for @include
        //      lib/std/
        //          ... # mounted, read only, cps lib
        //
        //
        // planned project dir:
        // projectio/
        //      project.yaml
        //      cps/
        //          main.cps # could be anywhere though, but this is the default
        //          ... # more cps files for @include
        //      fonts/
        //          bauhaus.yaml
        //          ... # eventually more fonts
        //
        //      lib/std/
        //          ... # mounted, read only, cps lib
        //      lib/fonts/
        //          ... # mounted, read only, more fonts
    }

    // Load a project from a zip file
    function loadProject(zipBlob) {
        // what's the file format?
        // zip with cps files + one project/BEOM file?
        // so, the font in the beginning will be living in the project?
        // kind of smalltalk-esque! but kind of nice as well.
        // We should find a way, though to have many fonts, or at least
        // different ones.
        // Also, eventually we should ship "system fonts" with the app
        // and mount them into the project. If we want to change them,
        // a copy in the project should be created.
        // Needs a write protection!
        //
        // If not zipped, all would have to be dumped into one file
        // This sounds either like a YAML-IO and heavily relies on double
        // encoding, or I make a container file format.
        // the latter is not that bad, considering that we can cheaply
        // put our cps files into a key value storage and from there into
        // an InMemory io.
        // Unlike Metapolator this can be done simply and should happen.
        // The metapolator ufo model is not a topic here.
        // keys:
        // `beom` the whole object tree
        // `cps` key/value pairs of cps file paths
        // `current_main` path to current  main file.
        // more?
        var io = new InMemoryIO();
        return zipUtil.unpack(true, zipBlob, io, '/').then(function() {
            var project = new Project(io, cpsDir, cpsDir + '/' + cpsFile);
            project.load();
            return project;
        }).then(null, function(err) {
            console.error('loadProject: Something went wrong!');
            console.log(err);
            throw err;
        });
    }

    /**
     * returns a promise from zipUtil.pack with a blob as value
     */
    function zipProject(project) {
        project.save();
        return zipUtil.pack(true, project.rawIO, '', 'blob');
    }

    function initMountingIO(io, cpsLibIoMounts) {
        // FIXME: this setup loading should be part of MountingIO
        var mio = new MountingIO(io)
          , i, l
          ;
        for(i=0,l=cpsLibIoMounts.length;i<l;i++) {
            // no two mount points may be the same!
            mio.mount(
                    // just a kind of a hard link in the second case
                    cpsLibIoMounts[i].io || io
                    // the default is lib, and a "lib/" should be the beginning
                    // of a configured mountPoint as well. Otherwise
                    // Project may start to write to the cpsLibIo
                    // (There's a write protection open to be implemented …)
                    , [cpsDir, cpsLibIoMounts[i].mountPoint || 'lib'].join('/')
                    // the default is ''
                    , cpsLibIoMounts[i].pathOffset
                    , cpsLibIoMounts[i].allowAboveRoot
            );
        }

        return mio;
    }

    function Project(io, cpsDir, cpsFile) {
        this.io = initMountingIO(io, cpsLibIoMounts);
        this.rawIO = io;
        this._cpsFile = cpsFile;

        this.selectorEngine = new SelectorEngine();
        this.ruleController = new RuleController(this.io, cpsDir
                        , cpsTools.initializePropertyValue
                        , this.selectorEngine.selectorEngine
                        );
        // For a new project, the cps file should be probably empty.
        // But maybe, there can be some kind of minimal useable CPS file
        // Probably doing even less than the circle font.
        // This will take a cps library dir, to be added to the project.
        this.controller = new CPSController( this.ruleController
                                    , Root.factory, this.selectorEngine);

        this.scene = null;
        this.builder = null;
        // must run either init or load now
    }

    var _p = Project.prototype;
    _p.constructor = Project;

    _p.init = function() {
        this.controller.rootNode.attachData('cpsFile', this._cpsFile);
        // todo: move main() FontBuilder stuff here s...

        var fontData = staticIO.readFile(false, 'project/font.yaml')
          , root = this.controller.rootNode
          , fontInfo = FontInfo.fromYAML(root.font, fontData)
          ;
        this.scene = root.scene;
        this.scenebuilder = new SceneBuilder(fontInfo, this.scene);
    };

    _p.load = function() {
        var yamlString = this.io.readFile(false, 'project.yaml')
          , data = yaml.safeLoad(yamlString)
          , root
          , fontInfo
          ;
        this.controller.rootNode.loadTree(data);
        root = this.controller.rootNode;
        fontInfo = new FontInfo(root.font);
        this.scene = root.scene;
        this.scenebuilder = new SceneBuilder(fontInfo, this.scene);
    };

    _p.save = function () {
        // FIXME: still a stub. never tested.
        var data, yamlString;
        // save cps files
        this.ruleController.saveChangedRules(false);
        data = this.controller.rootNode.dumpTree();
        yamlString = yaml.safeDump(data);
        this.io.writeFile(false, 'project.yaml', yamlString);
    };


    /**
     * This function is temporarily bad design on purpose.
     * Will be refactored.
     */
    function temp_bootstrapUI(project) {
        /* global document:true, window:true*/

        var svg = document.createElementNS(svgns, 'svg')
            // need these for updates etc...
          , scene = project.scene
          , builder = project.scenebuilder
          ;

        svg.setAttribute('width', '600px');
        svg.setAttribute('viewBox', '0 0 600 600');
        svg.style.border = '1px solid black';

        var input = document.createElement('textarea');
        // FIXME: this is only OK for brand new projects.
        input.value = 'ALL YOUR BAUHAUS ARE BELONG TO US';
        input.style.verticalAlign = 'top';

        // changes in the cps of child nodes are also monitored by this
        // This is firering too often. Probably the deletion of items before
        // is causing a loop. It seems that this bever stops. check!
        var lastVal = null
          , subscription = null
          , timeout = null
          ;
        var update = (function () {
            timeout = null;
            while(svg.children.length)
                svg.removeChild(svg.lastChild);
            // do we want to do this even when this.value did not change?
            if(lastVal !== this.value) {
                lastVal = this.value;
                builder.setScene(this.value);
            }
            else
                // reflow ...
                builder.reflow();
            // Don't update for changes caused by reflow/setScene, this
            // concept works since/because StyleDict triggers synchronously!
            // Thus, all changes caused by the reflow are already registered
            // in the scene and its children, flushStyleChanges also flushes
            // the children.
            scene.flushStyleChanges();
            drawScene(scene, svg);
        }).bind(input);

        var onChange = function() {
            if(timeout)
                clearTimeout(timeout);
            // redrawing is expensive and locks up the UI at the moment
            // this debonces feedback on the canvas, the trade is that
            //  the sliders run smoothly.
            timeout = setTimeout(update, 70);
        };

        input.addEventListener('input', onChange.bind(null, true));

        // FIXME: We want this only for new projects, not for loaded ones
        // because on loaded projects, the input field value may be out of
        // sync with the actual scene (manual tampering?) and we don't want
        // to destroy the actually saved OM by calling update.
        update.call(input, true);

        subscription = scene.on(['CPS-change'], function() {
            onChange(false);
        });

        function inputDirective() {
            function link(scope, element, attrs, controller) {
                //jshint unused: vars
                var  domElement = element[0];
                domElement.appendChild(input);
            }
            return {
                restrict: 'E'
              , link: link
            };
        }
        function canvasDirective() {
            function link(scope, element, attrs, controller) {
                //jshint unused: vars
                var  domElement = element[0];
                domElement.appendChild(svg);
            }
            return {
                restrict: 'E'
              , link: link
            };
        }
        angularApp.directive('befInput', inputDirective);
        angularApp.directive('befCanvas', canvasDirective);

        var dragDataService = new DragDataService()
          , dragIndicatorService = new DragIndicatorService()
          ;
        angularApp.constant('cpsTools', cpsTools);
        angularApp.constant('cpsController', project.controller);
        angularApp.constant('ruleController', project.ruleController);
        angularApp.constant('dragDataService', dragDataService);
        angularApp.constant('dragIndicatorService', dragIndicatorService);
        angular.bootstrap(document, [angularApp.name]);

        // temporarily until we have project management
        window.dumpCPS = function() {
            var win = window.open()
              , document
              , content
              ;
            if(!win) return;
            document = win.document;
            content = document.createElement('pre');
            content.innerText = project.ruleController.getRule(false, cpsFile) + '';
            document.body.appendChild(content);
        };
    }

    function main() {
        // initializes a new project

        // now, newProject (+Project.init) is the only reason why we need the
        // Atem-IO-REST server.
        // There should be a nicer version of this. Maybe a script hat creates
        // a new project zip from a directory and a unit test, that checks that
        // the zip and the original source are in sync. That way we can
        //      a) easily change the initial project
        //      b) get rid of the Atem-IO-REST server, which also can write to disk (bad)
        // We'll probably have more than one initial projects, they all should be created
        // (zipped) by a script and tested by Travis.
        //
        // Metadata for the projects should be available outside of the zip
        // so the user can have a description of the contents.
        //
        //
        // We need now load/save interfaces.
        // Add a local storage fs? would be nice to have.

        var project = newProject();
        //temp_bootstrapUI(project);

        // zips the project
        zipProject(project).then(function(zipBlob) {
            // a way to start a download.
            // download links are preferred though!
            // window.open(URL.createObjectURL(zipBlob));

            // round tripping. This is pretty stupid here, but the best
            // way to see if we can load a zipped project, and a good way
            // to debug.
            loadProject(zipBlob).then(temp_bootstrapUI);
        });
    }

    return domReady.bind(null, main);
});

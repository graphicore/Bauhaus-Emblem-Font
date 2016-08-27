define([
    'require/text!./number.tpl'
  , 'Atem-Property-Language/parsing/ASTOperation'
  , 'Atem-Property-Language/parsing/ASTGrouping'
  , 'Atem-Property-Language/parsing/_VoidToken'
  , 'Atem-Property-Language/flavours/MOM/Expression'
  , 'BEF/cpsTools'
  , 'Atem-Math-Tools/Vector'
    ], function(
    template
  , ASTOperation
  , ASTGrouping
  , _VoidToken
  , Expression
  , cpsTools
  , Vector
) {
    "use strict";

    // FIXME: it would be advisable to separate the view logic from the
    // business logic. Though that's not so straaight forward, look at init
    // where `state` is created ... all concerns (event handling/business)
    // get's mixed. Clean separation will however be key to make this
    // reusable code.

    var svgns = 'http://www.w3.org/2000/svg';

    function attachCircle(element, vector, r) {
        var child = element.ownerDocument.createElementNS(svgns, 'circle');
        child.setAttribute('cx', vector[0]);
        child.setAttribute('cy', vector[1]);
        child.setAttribute('r', r);
        element.appendChild(child);
        return child;
    }

    /**
     *  Return the first none-_VoidToken in args or null;
     */
    function getFirstArg(args) {
        var i,l;
        for(i=0,l=args.length;i<l;i++) {
            if(args[i] instanceof _VoidToken)
                continue;
            return args[i];
        }
        return null;
    }

    //////
    // tools for _cpsUIInitDrag
    //////
    function replaceItemInAST(item, oldItem, newItem) {
        if(item === oldItem)
            return newItem;
        if(item instanceof ASTGrouping)
            return  replaceItemInASTGrouping(item, oldItem, newItem);
        if(item instanceof ASTOperation)
            return replaceItemInASTOperation(item, oldItem, newItem);
        // not changed
        return item;
    }

    function replaceItemInASTGrouping(grouping, oldItem, newItem) {
        // keep branches unchanged that are not changed by inserting newOperation
        var result
          , oldNodes = grouping.nodes
          , i, l, item
          , newNodes = []
          , changed = false
          ;
        for(i=0,l=oldNodes.length;i<l;i++) {
            item = oldNodes[i];
            result = replaceItemInAST(item, oldItem, newItem);
            newNodes.push(result);
            if(result !== item)
                changed = true;
        }
        return (changed
                    ? new ASTGrouping(grouping.groupingToken, newNodes)
                    : grouping);
    }

    function replaceItemInASTOperation(operation, oldItem, newItem) {
        // keep branches unchanged that are not changed by inserting newOperation
        var result
          , key, oldArgs, newArgs, i, l, item
          , allNewArgs = {
                postArguments: []
              , preArguments: []
            }
          , changed = false
          ;
        for(key in allNewArgs) {
            oldArgs = operation[key];
            newArgs = allNewArgs[key];
            for(i=0,l=oldArgs.length;i<l;i++) {
                item = oldArgs[i];
                result = replaceItemInAST(item, oldItem, newItem);
                newArgs.push(result);
                if(result !== item)
                    changed = true;
            }
        }
        return (changed
                    ? new ASTOperation(operation.operator
                                     , allNewArgs.preArguments
                                     , allNewArgs.postArguments)
                    : operation);
    }

    function replaceProperty(propertyDict, oldProperty, newProperty) {
        var propertyIndexes = propertyDict.find(oldProperty.name)
          , i, l, index
          ;
        for(i=0,l=propertyIndexes.length;i<l;i++) {
            index = propertyIndexes[i];
            // found
            if(propertyDict.getItem(index) === oldProperty) {
                propertyDict.splice(index, 1, newProperty);
                return true;
            }
        }
        // not found
        return false;
    }


    function update(event) {
        /* jshint validthis:true */
        var ast = this.property.value.value.ast
          , newAST , newOperation , newProperty, oldProperty
          // like: "(Vector 10 100)"
          // The parenthesis are intentional, so we don't have to know about
          // the nature of the other args;
          , newArgumentFormula, newArgument
          , firstArg
          , delta, newIntrinsic
          ;

        delta = event.clientX - this.initialPos.x;
        if(delta === 0)
            return;
        firstArg = getFirstArg(this.astOperation.postArguments);
        if(!firstArg)
            // this means there was no none-_VoidToken in postArguments
            throw new Error('A UI item must have at least one argument!');

        newIntrinsic = this.intrinsic + (delta / 10);
        newArgumentFormula = ['(' ,  newIntrinsic , ')'].join('');
        newArgument = Expression.factory(newArgumentFormula)[1].ast.nodes[0];
        // assert newArgument instanceof ASTGrouping
        // assert newArgument.groupingToken.literal === '('

        // <==specific | generic==>

        newOperation = replaceItemInAST(this.astOperation, firstArg, newArgument);
        if(newOperation === this.astOperation) {
            // because then we are unable to create a change here, for any reason
            // maybe the property was rewritten by another routine.
            // That means the update process lost its mandate.
            console.warn('newOperation === this.astOperation', newOperation);
            this.stop();
            return;
        }

        newAST = replaceItemInAST(ast, this.astOperation, newOperation);
        if(newAST === ast) {
            // because then we are unable to create a change here, for any reason
            // maybe the property was rewritten by another routine.
            // That means the update process lost its mandate.
            console.warn('newAST === ast', newAST);
            this.stop();
            return;
        }

        newProperty = cpsTools.makeProperty(this.property.name, new Expression(newAST));
        // remember this.property because we want to update it before
        // the call to replaceProperty.
        oldProperty = this.property;
        this.property = newProperty;
        this.astOperation = newOperation;

        // finally, bring the update to the model
        if(!replaceProperty(this.rule.properties, oldProperty, newProperty)) {
            // because then we are unable to create a change here, for any reason
            // maybe the property was rewritten by another routine.
            // That means the update process lost its mandate.
            console.warn('!replaceProperty');
            this.stop();
            return;
        }
    }

    function stop(doc, e) {
        /* jshint validthis:true, unused:vars */
        doc.removeEventListener('mousemove', this.update, false);
        doc.removeEventListener('mouseup', this.stop, false);
    }

    function init(item, event) {
        var element = event.target
          , uiItem, doc, state
          ;
        if(!element.hasAttribute('data-is-ui'))
            return;
        uiItem = item.uiItem;
        doc = element.ownerDocument;
        event.preventDefault();
        state = {
            rule: uiItem.rule
          , initialPos: new Vector(event.clientX, event.clientY)
          , intrinsic: uiItem.value // need all arguments to render and to change update behavior
          // methods
          , update: null
          , stop: null
          // these are going to be changed on update:
          , property: uiItem.property
          , astOperation: uiItem.astOperation
        };

        state.update = update.bind(state);
        state.stop = stop.bind(state, doc);

        doc.addEventListener('mousemove', state.update);
        doc.addEventListener('mouseup', state.stop);
    }

    var UIArguments = (function() {
    // bad indentation because this will become its own module

    function UIArguments(setup, args) {

        this._parseArgs(args);
    }
    var _p = UIArguments.prototype;

    UIArguments.factory = function parseArgs(argsSetup, args) {
        return new UIArguments(setup, args);
    }

    _p._parseKeyword = function(keywordString, i, args) {
        var setup, data, keyword, flags
          , consumed = 0
          ;
                // split by any whitespace
        data = keywordString.split(/\s+/)
                // remove empty entries (from beginning and end)
                .filter(function(s){ return !!s; })
                ;

        keyword = data[0];
        if(!(keyword in this._keywords))
            throw new CPSUIError(
                keyword
                    ? 'Unknown keyword string "'+keyword+'"'
                    : 'Empty keyword string "'+keyword+'"'
            );

        flags = new Set(data.slice(1));
        setup = this._keywords[keyword];

        setup.amount || 1
        --> default is one, otherwise it should be bigger than 1 up to Infinity
        --> each keyword with more than one allowed entries will be stored in an
            array. A single appearance keyword is stored directly as value?
        --> should we do a min max thing here?
        --> is amount here min = max = amount?
        --> if yes, we should also have [3,5] for min 3 max 5

        setup.defaultFlags || new Set()
        --> there are some flags that contradict each other, like min and max
        --> so the default is min, but if there's a max, min should not be set
        --> I'd also prefer to fail if there's more than on min or max flag


        setup.value || or null
        --> a function that accepts or refuses an input as value
        --> if accepted, consumed is increased by one
        --> could run until it refuses an input and should know the number
            of the iteration, so it can shut down when it has enough

        if(!(keyword in this._parsed))
            this._parsed[keyword] = [];
        this._parsed[keyword].push(result);
        return consumed;
    }

    _p._parseArgs = function (args) {
        var i, l, item;
        for(i=0,l=args.length;i<l;i++) {
            item = args[i];
            if(typeof item !== 'string')
                throw new CPSUIError('Expected a keyword string but got a ('
                                        + (typeof item) + '): ' + item);
            i += this._parseKeyword(item, i, args);
        }
    }

    // bad indentation end;
    })();

    /**
     *
     * A keyword with its flags is given as one compound string
     * if a value is following a keyword it's given as a value.
     *
     * The parser can and will raise errors, these can be displayed
     * in the user interface directly.
     *
     * TODO: different interfaces for the same value may need differnt
     * arguments. It would be nice to have a solution where one UI element
     * can be configured for different interface types.
     * We'll need a good case for this before implementing anything.
     *
     * // n of these
     * "mark <flags>" value
     *     arguments:
     *         number (required)
     *     flags:
     *         "limiting"
     *             Set the mark to be a boundary. The lower bound
     *             will be min and the upper bound will be max.
     *             If more than two boundaries are defined, the
     *             boundaries with values between lower and upper
     *             are discarded.
     *         "min" or "max" (optional) default: "min"
     *             min and max are only used if there is just one
     *             boundary defined. otherwise
     *
     * "unbounded"
     *     While editing, the drag handle can leave the ui-elements
     *     canvas to give better/different feedback.
     *     After editing the disllay will be adjusted.
     *     (experimental)
     *     // will need state information from the changing action
     *     // which is kind of sub-optimal! maybe the changing
     *     // action would have to draw itself, which is kind of
     *     // against the current concept of using the feedback to
     *     // update the display.
     *
     * "delta <flags>" magnitude
     *     arguments:
     *         magnitude:integer default 0 (optional)
     *             The final delta will be calculated by:
     *             `delta * Math.pow( 10, magnitude)`
     *             So, a negative magnitude moves the decimal point
     *             to the left while a positive value moves it to
     *             the right.
     *             Math.pow( 10, 3)
     *                 > 1000
     *             Math.pow( 10, 0)
     *                 > 1
     *             Math.pow( 10, -3)
     *                 > 0.001
     *             `magnitude` must be a whole number (integer).
     *     flags:
     *         "move" default (if feasible: test this!)
     *         "interval"
     * "roc <flags>"
     *     Rate of change function.
     *     flags:
     *         "linear" default
     *             The change corresponds to the raw determined
     *             change; e.g. actual pixels of mouse movement.
     *         "cubic"
     *             Math.pow(change, 3), setting `delta magnitude`
     *             to something negative may help here to make
     *             the effect less extreme.
     *             Using cubic here because it works nicely with
     *             negative inputs as well.
     *             The idea here is that the having the mouse
     *             further away from the origin creates at some point
     *             a bigger change than the linear version. With
     *             lower inputs it should be more sensitive than
     *             the linear one.
     *         tbc. if requested.
     * "precision" magnitude
     *     Round to precision. maginute works as in delta and
     *     describes the first significant decimal position, the
     *     default (without precision) is doing nothing. To round
     *     to integers magnitude must be 0.
     *     arguments:
     *         magnitude:integer (required)
     */
    var parseArgs = UIArguments.factory.bind(null, uiArgsumentsSetup);

    function numberDirective() {
        function link(scope, element, attrs, ctrl) {
            // sometimes, here the item uiItem in ctrl.item is not
            // yet the current item. Meaning that the operation fails here
            // how can we make sure that the uiItem is always the latest one.
            // ALSO, how is it possible that the latest update is lost
            // here for longer.
            // since the contents of item are set by the ui-panel, it seems
            // like there's a update skipped or so.

            // one listener for all mousedowns for now
            element.on('mousedown', init.bind(null, ctrl.item));

            function draw(svg, item) {
                // clean the slate
                while(svg.lastChild)
                    svg.removeChild(svg.lastChild);

                // parse the arguments of uiItem and draw the wiget accordingly.

                var handle = attachCircle(svg, [10, 10], 5);
                handle.setAttribute('data-is-ui', '');
            }
            var svg = element[0].ownerDocument.createElementNS(svgns, 'svg')
              , redrawHandler = draw.bind(null, svg, ctrl.item)
              , subscription = ctrl.item.on('update', redrawHandler)
              ;
            redrawHandler();
            element.append(svg)
            // It's likely that item gets destroyed now as well.
            // But, you can't know that for sure in here!
            element.on('$destroy', function() {
                ctrl.item.off(subscription);
            });

        }
        return {
            restrict: 'E' // only matches element names
          , controller: 'CPSUINumberController'
          , replace: false
          , template: template
          , scope: true
          , bindToController: {
                item: '='
            }
          , controllerAs: 'ctrl'
          , link: link
        };
    }
    numberDirective.$inject = [];
    return numberDirective;
});

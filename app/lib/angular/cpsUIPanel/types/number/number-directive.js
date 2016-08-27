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
        this._setup = this._parseSetup(setup);
        this._parsed = this._parseArgs(args);
    }
    var _p = UIArguments.prototype;

    UIArguments.factory = function parseArgs(argsSetup, args) {
        return new UIArguments(argsSetup, args);
    };

    _p._parseSetup = function(setup) {
        var result = Object.create(null)
          , k, setting, amount
          ;
        for(k in setup) {
            result[k] = setting = Object.create(null);
            if( (amount = setup[k].amount) )
                setting.amount = typeof amount === 'number'
                    ? [amount, amount]
                    : amount // [min, max]
                    ;
            else
                // default is one
                setting.amount = [1, 1];
            setting.valueFunc = setup[k].value || null;
        }
        return result;
    };

    _p._parseKeyword = function(keywordString, i, args) {
        var setup, data, keyword, valueFunc
          , consumed = 0
          , result = {
                flags: null
              , values: null
            }
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
        setup = this._setup[keyword];
        result.flags = new Set(data.slice(1));

        // Check amount? Min can only be checked later but we can break
        // up early here.
        if(!(keyword in this._parsed))
            this._parsed[keyword] = [];
        else if(this._parsed[keyword].length > setup.amount[1])
            throw new CPSUIError('Keyword "' + keyword + '" has more occurences '
                + 'than ' + setup.amount[1] + '.');


        // A function that accepts or refuses an input as value.
        // If accepted, consumed is increased by one.
        // Runs until it refuses an input and should know the number of the
        // iteration (=consumed), so it can shut down when it has had enough.
        result.values = [];
        valueFunc = setup.valueFunc;
        while(valueFunc && valueFunc(args[i+=1], consumed)) {
            consumed++;
            result.values.push(args[i]);
        }

        this._parsed[keyword].push(result);
        return consumed;
    };

    _p._parseArgs = function (args) {
        var i, l, k, item, setup, count;
        for(i=0,l=args.length;i<l;i++) {
            item = args[i];
            if(typeof item !== 'string')
                throw new CPSUIError('Expected a keyword string but got a ('
                                        + (typeof item) + '): ' + item);
            // skips the consumed items
            i += this._parseKeyword(item, i, args);
        }
        for( k in this._setup ) {
            setup = this._setup[k];
            count = k in this._parsed
                        ? this._parsed[k].length
                        : 0
                        ;

            if(setup.amount[0] > 0 && setup.amount[0] < count)
                throw new CPSUIError('Not enough occurences of keyword '
                        + '"' + k +'" '
                        + 'required is ' + setup.amount[0] + ' '
                        + 'but got: ' + count + '.');
            if(setup.after)
                // using `.call(null, ...) because there's no reason
                // why after should have access to setup.
                this._parsed[k] = setup.after.call(null, this._parsed[k] || []);
        }
    };

    _p.get = function(keyword) {
        return this._parsed(keyword);
    };

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
     *             boundary defined.
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
    var uiArgsumentsSetup = {
        mark: {
            amount: [0, Infinity]
          , valueFunc: function(value, i) {
                // jshint unused: vars
                return typeof value === 'number';
            }
          , after: function drawMarks(items) {
                var i, l, mark
                  , limits = []
                  , marks = []
                  , min = null
                  , max = null
                  ;
                for (i=0,l=items.length;i<l;i++) {
                    mark = items[i];
                    if(mark.flags.has('limiting'))
                        limits.push(mark);
                    else
                        marks.push(mark);
                }

                if(limits.length > 2)
                    for (i=0,l=limits.length;i<l;i++) {
                        if(!min || min.value > limits[i].value)
                            min = limits[i];
                        if(!max || max.value < limits[i].value)
                            max = limits[i];
                    }
                else if(limits.length === 1)
                    if (limits[0].flags.has('max'))
                        max = limits[0];
                    else
                        min = limits[0];

                return {min: min, max: max, marks: marks};
            }
        }
      , unbounded: {
            // this behaves like a flag, also currently not implemented
            amount: [0, 1]
        }
      , delta: {
            // defaults to `"delta move" 0` if not present
            amount: [0, 1]
          , valueFunc: function(magnitude, i) {
                // jshint unused: vars
                if (typeof magnitude !== 'number')
                    return false;
                if (magnitude !== magnitude | 0)
                    throw new CPSUIError('Wrong type, `magnitude` of `delta` '
                            + 'must be an integer, but is: ' + magnitude + '.');
                return true;
            }
        }
      , roc: {
            // defaults to "roc linear" if not present
            amount: [0, 1]
        }
      , precision: {
            amount: [0, 1]
          , valueFunc: function(magnitude, i) {
                // jshint unused: vars
                if (typeof magnitude !== 'number')
                    return false;
                if (magnitude !== magnitude | 0)
                    throw new CPSUIError('Wrong type, `magnitude` of `precision` '
                            + 'must be an integer, but is: ' + magnitude + '.');
                return true;
            }
        }
    };
    var parseArgs = UIArguments.factory.bind(null, uiArgsumentsSetup);

    function draw(svg, item) {
        // clean the slate
        while(svg.lastChild)
            svg.removeChild(svg.lastChild);

        // parse the arguments of uiItem and draw the wiget accordingly.
        // TODO: should UIArguments parse the values as well?
        var args = parseArgs(item.uiItem.arguments.slice(1))
          , marks, allValues, max, min
          ;

        // get the biggest and smallest value to display, this way
        // we know the bounds to draw for the widget.
        marks = args.get('mark');
        allValues = marks.marks.slice();
        if(marks.max !== null)
            allValues.push(marks.max);
        if (marks.min !== null)
            allValues.push(marks.min);
        allValues = allValues.map(function(item){ return item.value; });
        allValues.push(item.uiItem.value);
        max = Math.max.apply(null, allValues);
        min = Math.min.apply(null, allValues);

        // With this formula, we can position all elements between
        // 0 and 100 %
        // Now just some iteration is needed and to draw the right
        // icon for each item!
        // let's see how this comes out, without caring for edge cases!
        normalizedMax = max - min;
        normalizedValue = value - min;
        position = normalizedValue / normalizedMax;

        var handle = attachCircle(svg, [10, 10], 5);
        handle.setAttribute('data-is-ui', '');
    }

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

            var svg = element[0].ownerDocument.createElementNS(svgns, 'svg')
              , redrawHandler = draw.bind(null, svg, ctrl.item)
              , subscription = ctrl.item.on('update', redrawHandler)
              ;
            redrawHandler();
            element.append(svg);
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

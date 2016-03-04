define([], function() {
    "use strict";

    function _copy(source) {
        var target = Object.create(null), k;
        for(k in source) target[k] = source[k];
        return target;
    }

    // See: EUGENE W. MYERS An O(ND) Difference Algorithm and Its Variations
    // http://www.xmailserver.org/diff2.pdf
    // supported by this: http://www.codeproject.com/Articles/42279/Investigating-Myers-diff-algorithm-Part-of
    function getPatchScript (a, b) {
        var n = a.length
          , m = b.length
          , max = n+m
          , d, k, x, y
          // Var V: Array [− MAX .. MAX] of Integer
          , V = Object.create(null)
          , vs = []
          ;
          // V is an array of integers where V[k] contains
          // the row index of the endpoint of a furthest reaching path in diagonal k.
          V[1] = 0;

        // For D ← 0 to M+N Do
        for (d=0;d<=max;d++) {
            // For k ← −D to D in steps of 2 Do
            for (k = -d; k <= d;k += 2) {
                //Find the endpoint of the furthest reaching D-path in diagonal k.

                // If k = −D or k ≠ D and V[k − 1] < V[k + 1]
                if (k === -d || (k !== d && V[k-1] < V[k+1])) {
                    //    x ← V[k + 1]
                    x = V[k + 1]; // going down === insert
                }
                else {
                //    x ← V[k − 1]+1
                    x = V[k - 1] + 1; // going right === delete
                }
                // Furthermore, to record an endpoint (x,y) in diagonal k it
                // suffices to retain just x because y is known to be x − k.
                // y ← x − k
                y = x - k;
                // While x < N and y < M and a x + 1 = b y + 1 Do (x,y) ← (x+1,y+1)
                // used to be a[x + 1] === b[y + 1] once, but this seems correct!?
                while(x<n && y<m && a[x] === b[y]) {
                    x += 1;
                    y += 1;
                }
                // V[k] ← x
                V[k] = x;
                // If (N,M) is the endpoint Then the D-path is an optimal solution.
                // If x ≥ N and y ≥ M
                if(x>=n && y>=m) {
                    // Length of an SES is D
                    // SES = shortest edit script
                    vs.push(_copy(V));
                    return _makeShortestEditingScript(a, b, vs);
                }
            }
            // store a copy of V after each iteration of the outer loop
            // Let V d be the copy of V kept after the d th iteration.
            // (the index of the copy of V is equal d, because d starts at 0)
            vs.push(_copy(V));
        }
        // Length of an SES is greater than MAX
        // This should never happen
        throw new Error('Something went terribly wrong.');
    }

    function _makeShortestEditingScript(a, b, vs) {
        // vs saved V's indexed on d
        var script = []
          , x, y, d, V, k
          ;

        if(vs.length <= 1) return script;

        x = a.length;
        y = b.length;
        for(d = vs.length-1; x > 0 || y > 0; d--) {
            V = vs[d];
            k = x - y;
            if (k === -d || (k !== d && V[k-1] < V[k+1])) {
                k += 1;
                x = V[k];
                y = x - k;
                // I got some cases that yield in ['I', 0, undefined]
                // when y === -1 (usually when d === 0). We don't need
                // these commands at all. There is probably a more elegant
                // way to do this, but this works so far.
                if(y >= 0)
                    script.push(['I', x, b[y]]);
            }
            else {
                k -= 1;
                x = V[k];
                y = x - k;
                script.push(['D', x]);
            }
        }
        return script.reverse();
    }

    function applyPatch(script, data) {
        var offset = 0
            // allow data to inject it's own slice interface
          , d = typeof data.slice === 'function'
                        ? data
                        : Array.prototype.slice.call(data)
          , i, l, cmd, idx
          ;
        for(i=0,l=script.length;i<l;i++) {
            cmd = script[i];
            idx = cmd[1] + offset;
            if(cmd[0]==='D') {
                d.splice(idx, 1);
                offset -= 1;
            }
            else if (cmd[0] === 'I') {
                d.splice(idx, 0, cmd[2]);
                offset += 1;
            }
            else
                throw new Error('Command "'+cmd[0]+'" unknown at index '
                                            + i + ' ['+cmd.join(', ')+'])');
        }
        // If oldVersion was a string return a string or if data.slice is
        // a function the original data object otherwise an array.
        return typeof oldVersion === 'string' ? d.join('') : d;
    }

    // this is just a stub.
    function test() {
        /* globals console:true */
        var cases = [
                ['abcabba', 'cbabac']
              , ['cbabac', 'abcabba']
              , ['holgi', 'horst']
              , ['motorhead', 'motörhead']
              , ['hello world', 'hello pony']
              , ['unicorn', 'robotunicornattack']
              , ['superpolator', 'metapolator']
              , ['robofont', 'trufont']
              , ['multivers', 'univers']
              , ['Staatliches Bauhaus Weimar', 'All your Bauhaus are belong to us']
              , ['this equals', 'this equals']
              , ['all', 'different']
              , [[1,2,3,4,5,6], [0,2,4,6,8,10]]
            ]
          , i, l, script, result
        ;
        for(i=0,l=cases.length;i<l;i++) {
            script = getPatchScript.apply(null, cases[i]);
            // console.log('script:', script.map(function(t){ return t.join('');}).join(', '));
            result = applyPatch(cases[i][0], script);
            console.log(JSON.stringify(result) === JSON.stringify(cases[i][1])
                                    ? 'OK  ' : 'FAIL'
                    , '"'+cases[i][0]+'"', 'to'
                    , '"'+cases[i][1]+'"', '=>'
                    , '"'+result+'"');
        }
    }

    return {
        getPatchScript: getPatchScript
      , applyPatch: applyPatch
      , test: test
    };
});





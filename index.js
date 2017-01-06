(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    return mod(require("tern/lib/infer"), require("tern/lib/tern"), require("acorn/dist/walk"))
  if (typeof define == "function" && define.amd) // AMD
    return define(["tern/lib/infer", "tern/lib/tern", "acorn/dist/walk"], mod)
  mod(tern, tern, acorn.walk)
})(function(infer, tern, walk) {
  "use strict"
  function findModules(file) {

    walk.simple(file.ast, {
      CallExpression: function(node) {
        var callee = node.callee
        if (callee && callee.object && callee.object.name === 'TS'
            && callee.property && callee.property.name && callee.property.name === 'registerModule'
            && node.arguments[0].type === 'Literal' && node.arguments.length === 2) {
          //get top scope:
          var scope = file.scope
          while (scope.prev) {
            scope = scope.prev
          }

          if (scope.name === '<top>') {
            // Create a global TS if it doesn't exist
            if (!scope.hasProp('TS')) {
              var outObj = new infer.Obj(true)
              scope.defProp('TS', outObj);
              scope.props.TS.addType(outObj);
            }
            var TS = scope.props.TS;
            var moduleName = node.arguments[0].value;
            var depth = TS.types[0];
            if (moduleName.split('.').length > 1) {
              var scopes = moduleName.split('.').slice(0, -1);
              moduleName = moduleName.split('.').slice(-1).join();
              var scope = scopes.shift();
              while (scope) {
                if (depth.hasProp(scope)) {
                  // do nothing, we're golden
                } else {
                  var newObj = new infer.Obj(true)
                  depth.defProp(scope, newObj)
                  depth.props[scope].addType(newObj)
                }
                depth = depth.props[scope].types[0]
                scope = scopes.shift();
              }
            }
            var module = node.arguments[1];
            if (depth.hasProp(moduleName) || !module || !module.objType) {
              // Do nothing for now
            } else {
              depth.defProp(moduleName, module);
              depth.props[moduleName].addType(module.objType);
            }
          }

        }
      },
    })
  }

  tern.registerPlugin("register-module", function(server) {
    server.on("afterLoad", findModules)
  })
})


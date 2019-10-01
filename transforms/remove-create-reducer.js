function arrowFunctionBodyToCase(j, test, body) {
  if (body.type === "BlockStatement") {
    return j.switchCase(test, [body]);
  }
  return j.switchCase(test, [j.returnStatement(body)]);
}

export default function transformer(file, api) {
  const j = api.jscodeshift;

  const root = j(file.source);
  root
    .find(
      j.CallExpression,
      node =>
        node.callee.type === "Identifier" &&
        node.callee.name === "createReducer"
    )
    .forEach(createReducerPath => {
      let hasPersistence = false;

      if (createReducerPath.value.arguments.length < 2) {
        throw new Error("Unable to translate createReducer");
      }

      const [defaultState, handlerMap] = createReducerPath.value.arguments;

      const cases = handlerMap.properties.map(actionNode => {
        const test = actionNode.computed
          ? actionNode.key
          : j.literal(actionNode.key.name || String(actionNode.key.value));
        const fn = actionNode.value;

        if (
          test.type === "Identifier" &&
          (test.name === "SERIALIZE" || test.name === "DESERIALIZE")
        ) {
          hasPersistence = true;
        }

        if (
          test.type === "Literal" &&
          (test.value === "SERIALIZE" || test.value === "DESERIALIZE")
        ) {
          hasPersistence = true;
        }

        // If it's an arrow function without parameters, just return the body.
        if (fn.type === "ArrowFunctionExpression" && fn.params.length === 0) {
          return arrowFunctionBodyToCase(j, test, fn.body);
        }

        // If it's an arrow function with the right parameter names, just return the body.
        if (
          fn.type === "ArrowFunctionExpression" &&
          fn.params[0].name === "state" &&
          (fn.params.length === 1 ||
            (fn.params.length === 2 && fn.params[1].name === "action"))
        ) {
          return arrowFunctionBodyToCase(j, test, fn.body);
        }

        return j.switchCase(test, [
          j.returnStatement(
            j.callExpression(actionNode.value, [
              j.identifier("state"),
              j.identifier("action")
            ])
          )
        ]);
      });

      const newNode = j.functionExpression(
        null,
        [
          j.assignmentPattern(j.identifier("state"), defaultState),
          j.identifier("action")
        ],

        j.blockStatement([
          j.switchStatement(
            j.memberExpression(j.identifier("action"), j.identifier("type")),
            cases
          ),
          j.returnStatement(j.identifier("state"))
        ])
      );

      if (hasPersistence) {
        const parent = createReducerPath.parentPath;
        const grandParentValue =
          parent &&
          parent.parentPath.value &&
          parent.parentPath.value.length === 1 &&
          parent.parentPath.value[0];
        const greatGrandParent =
          grandParentValue &&
          parent &&
          parent.parentPath &&
          parent.parentPath.parentPath;

        if (
          parent &&
          grandParentValue &&
          greatGrandParent &&
          parent.value.type === "VariableDeclarator" &&
          grandParentValue.type === "VariableDeclarator" &&
          greatGrandParent.value.type === "VariableDeclaration"
        ) {
          const varName = parent.value.id.name;
          const persistenceNode = j.expressionStatement(
            j.assignmentExpression(
              "=",
              j.memberExpression(
                j.identifier(varName),
                j.identifier("hasCustomPersistence"),
                false
              ),
              j.literal(true)
            )
          );

          greatGrandParent.insertAfter(persistenceNode);
        } else if (parent && parent.value.type === "AssignmentExpression") {
          const persistenceNode = j.expressionStatement(
            j.assignmentExpression(
              "=",
              j.memberExpression(
                parent.value.left,
                j.identifier("hasCustomPersistence"),
                false
              ),
              j.literal(true)
            )
          );
          parent.parentPath.insertAfter(persistenceNode);
        } else {
          newNode.comments = newNode.comments || [];
          newNode.comments.push(
            j.commentLine(" TODO: HANDLE PERSISTENCE", true, false)
          );
        }
      }
      createReducerPath.replace(newNode);
    });

  root
    .find(
      j.ImportDeclaration,
      node =>
        node.specifiers &&
        node.specifiers.some(s => s.imported.name === "createReducer")
    )
    .forEach(node => {
      if (node.value.specifiers.length === 1) {
        j(node).remove();
      } else {
        node.value.specifiers = node.value.specifiers.filter(
          s => s.imported.name !== "createReducer"
        );
      }
    });

  return root.toSource();
}

/** @format */
export default function transformer(file, api) {
    const j = api.jscodeshift;
  
    return j(file.source)
      .find(j.CallExpression, { callee: { type: 'Identifier', name: 'dispatchRequest' } } )
      .forEach(path => {
        j(path).replaceWith( () => {
          const [ fetch, onSuccess, onError ] = path.node.arguments;
          return j.callExpression( j.identifier( "dispatchRequestEx" ),
          [
            j.objectExpression( [
              j.objectProperty( j.identifier( "fetch" ), fetch ),
              j.objectProperty( j.identifier( "onSuccess" ), onSuccess ),
              j.objectProperty( j.identifier( "onError" ), onError )
            ] )
          ]
          )
          }
        );
      })
      .toSource();
  }
  
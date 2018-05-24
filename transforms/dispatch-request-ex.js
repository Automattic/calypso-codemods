/** @format */
export default function transformer( file, api ) {
	const j = api.jscodeshift;
	const root = j( file.source );

	return root
		.find( j.CallExpression, { callee: { type: 'Identifier', name: 'dispatchRequest' } } )
		.forEach( path => {
			j( path ).replaceWith( () => {
				const [ fetch, onSuccess, onError ] = path.node.arguments;

				[ fetch, onSuccess, onError ].forEach( handler => {
					root.find( j.VariableDeclarator, { id: { name: handler.name } } ).forEach( p => {
						return j( p ).replaceWith( a => {
							const fn = a.node.init;
							const { params, body } = fn;

							params.shift();
							j( body )
								.find( j.CallExpression, { callee: { name: 'dispatch' } } )
								.replaceWith( ret => {
									return ret.node.arguments;
								} );
							return a.node;
						} );
					} );
				} );

				return j.callExpression( j.identifier( 'dispatchRequestEx' ), [
					j.objectExpression( [
						j.objectProperty( j.identifier( 'fetch' ), fetch ),
						j.objectProperty( j.identifier( 'onSuccess' ), onSuccess ),
						j.objectProperty( j.identifier( 'onError' ), onError ),
					] ),
				] );
			} );
		} )
		.toSource();
}

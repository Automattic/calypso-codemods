/** @format */
export default function transformer( file, api ) {
	const j = api.jscodeshift;
	const root = j( file.source );

	return root
		.find( j.CallExpression, { callee: { type: 'Identifier', name: 'dispatchRequest' } } )
		.forEach( path => {
			j( path ).replaceWith( () => {
				const [ fetch, onSuccess, onError ] = path.node.arguments;

				root.find( j.VariableDeclarator, { id: { name: fetch.name } } ).forEach( p => {
					return j( p ).replaceWith( a => {
						const fn = a.node.init;
						const { params } = fn;
						params.shift();
						return a.node;
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

export default function transformer( file, api ) {
	const j = api.jscodeshift;

	const root = j( file.source );
	root
		.find(
			j.CallExpression,
			node => node.callee.type === 'Identifier' && node.callee.name === 'createReducer'
		)
		.forEach( node => {
			if ( node.value.arguments.length < 2 ) {
				throw new Error( 'Unable to translate createReducer' );
			}

			const [ defaultState, handlerMap ] = node.value.arguments;

			const cases = handlerMap.properties.map( node => {
				const test = node.computed
					? node.key
					: j.literal( node.key.name || String( node.key.value ) );

				return j.switchCase( test, [
					j.returnStatement(
						j.callExpression( node.value, [ j.identifier( 'state' ), j.identifier( 'action' ) ] )
					),
				] );
			} );

			const newNode = j.functionExpression(
				null,
				[ j.assignmentPattern( j.identifier( 'state' ), defaultState ), j.identifier( 'action' ) ],

				j.blockStatement( [
					j.switchStatement(
						j.memberExpression( j.identifier( 'action' ), j.identifier( 'type' ) ),
						cases
					),
					j.returnStatement( j.identifier( 'state' ) ),
				] )
			);
			node.replace( newNode );
		} );
	root
		.find(
			j.ImportDeclaration,
			node => node.specifiers && node.specifiers.some( s => s.imported.name === 'createReducer' )
		)
		.forEach( node => {
			if ( node.value.specifiers.length === 1 ) {
				j( node ).remove();
			} else {
				node.value.specifiers = node.value.specifiers.filter(
					s => s.imported.name !== 'createReducer'
				);
			}
		} );

	return root.toSource();
}

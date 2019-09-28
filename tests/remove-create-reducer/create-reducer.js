import { createReducer } from 'state/utils';

const COMPUTED_IDENTIFIER = 'COMPUTED_IDENTIFIER';

const isFetchingSettings = createReducer( false, {
	[ COMPUTED_IDENTIFIER ]: () => 'computed_id',
	[ 'COMPUTED_STRING' ]: state => state,
	NON_COMPUTED_STRING: ( state, action ) => action.thing,
	2: () => 2,
	FUNCTION_HANDLER: function( s, a ) {
		return s;
	},
	ARROW_FUNCTION_HANDLER: ( state, action ) => state,
	VARIABLE_HANDLER: f,
} );

function f() {
	return 'a function reducer';
}

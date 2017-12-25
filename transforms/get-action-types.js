/**
 * This transforms reports whether action type is imported by the file,
 * and the classification of the file.
 */

function output( obj ) {
  console.log( JSON.stringify( obj ) );
  return;
}

function getImportActionTypes( file, api ) {

  const j = api.jscodeshift;
  const src = j( file.source );

  const node = src.find( j.ImportDeclaration )
    .nodes()
    .filter(node => node.source.value.startsWith('state/action-types'))[0];

  if ( ! node ) {
    return;
  }

  let actionTypes = [];
  if ( 'ImportNamespaceSpecifier' === node.specifiers[0].type) {
    return [ '*' ];
  } else {
    return node.specifiers.map( node => node.imported.name );
  }
}

function isAction( file, api, actionTypes ) {
  const j = api.jscodeshift;
  const src = j( file.source );

  // Assumpotion: every reference to the action type identifiers must be the value
  // of an object property with property key named 'type'.

  const parentNodes = src.find( j.Identifier )
    .filter( path => actionTypes.indexOf( path.node.name ) !== -1 )
    .map( node => node.parent )
    .filter( path => 'ImportSpecifier' !== path.node.type )
    .nodes();

  const isAllActionTypeProperties =
    parentNodes.every( node => 'Property' === node.type && 'type' === node.key.name );

  return isAllActionTypeProperties;
}

function isDataLayerHandler( file, api, actionTypes ) {
  const j = api.jscodeshift;
  const src = j( file.source );
  const exportDefaultNode = src.find( j.ExportDefaultDeclaration ).nodes()[0];

  // Assumpotion: a file exports handlers exports a default object, and
  // the object is of the shape { [ ACTION_TYPE ]: [ ... ] }.
  // Or if it exports something returned by a function named 'mergeHandlers'.

  if ( ! exportDefaultNode ) {
    return false;
  }

  if ('CallExpression' === exportDefaultNode.declaration.type &&
      'mergeHandlers' === exportDefaultNode.declaration.callee.name ) {
    return true;
  }

  // Check the "shape" of the exportObject
  if ( 'ObjectExpression' === exportDefaultNode.declaration.type ) {
    return exportDefaultNode.declaration.properties
      .every(({ key, value }) => ('Identifier' === key.type && 'ArrayExpression' === value.type ));
  }

  return false;
}

function isReducer( file, api, actionTypes ) {
  const j = api.jscodeshift;
  const src = j( file.source );
  const exportDefaultNode = src.find( j.ExportDefaultDeclaration ).nodes()[0];

  // Assumpotion: a file exports something returned by a function named 'combineReducers' or 'createReducer'.

  if ( ! exportDefaultNode ) {
    return false;
  }

  if ('CallExpression' === exportDefaultNode.declaration.type &&
      ( 'combineReducers' === exportDefaultNode.declaration.callee.name ||
        'createReducer' === exportDefaultNode.declaration.callee.name ) ) {
    return true;
  }

  return false;
}

function isTestFile( file, api, actionTypes ) {
  const j = api.jscodeshift;
  const src = j( file.source );

  // File contain any function call with function named 'test' or 'it'.
  return !! src.find( j.CallExpression )
    .filter( path =>
      'test' === path.node.callee.name || 'it' === path.node.callee.name ).length;
}

module.exports = function ( file, api ) {
  const actionTypes = getImportActionTypes( file, api );

  if ( ! actionTypes ) {
    return;
  }

  if ( '*' === actionTypes[0] ) {
    return output( { file: file.path, classifications: [ 'console-dispatcher' ] } );
  }

  let classifications = [];
  if ( isAction( file, api, actionTypes ) ) {
    classifications.push( 'action' );
  } else if ( file.path.includes( '/actions' ) ) {
    classifications.push( 'maybe-action' );
  }

  if ( isDataLayerHandler( file, api, actionTypes ) ) {
    classifications.push( 'data-layer-handler' );
  } else if ( file.path.includes( '/data-layer' ) ) {
    classifications.push( 'maybe-data-layer' );
  }

  if ( isReducer( file, api, actionTypes ) ) {
    classifications.push( 'reducer' );
  } else if ( file.path.includes( '/reducer' ) ) {
    classifications.push( 'maybe-reducer' );
  }

  if ( isTestFile( file, api, actionTypes ) ) {
    classifications.push( 'test' );
  } else if ( file.path.includes( '/test' ) ) {
    classifications.push( 'maybe-test' );
  }

  if ( ! classifications.length ) {
    classifications.push( 'unknown' );
  }

  return output( { file: file.path, classifications, actionTypes } );
};

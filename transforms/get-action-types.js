/**
 * This transforms reports whether action type is imported by the file,
 * and the classification of the file.
 */

function output( obj ) {
  console.log( obj );
  return;
}

function getImportActionTypes( file, api ) {

  const j = api.jscodeshift;
  const src = j( file.source );
  const declarations = src.find( j.ImportDeclaration );

  const node = declarations
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

function isActionCreator( file, api, actionTypes ) {
  const j = api.jscodeshift;
  const src = j( file.source );

  // Assumpotion: a file exports named arrow functions and named functions only,
  // with no default.

  const declarationNodes = src.find( j.ExportNamedDeclaration ).nodes();

  if ( ! declarationNodes.length ||
       src.find( j.ExportDefaultDeclaration ).nodes().length !== 0) {
    return;
  }

  return declarationNodes.every(({ declaration }) => {
    if ('VariableDeclaration' === declaration.type &&
        1 === declaration.declarations.length &&
        'ArrowFunctionExpression' === declaration.declarations[0].init.type &&
        'ObjectExpression' === declaration.declarations[0].init.body.type ) {
      return true;
    }

    if ( 'FunctionDeclaration' === declaration.type ) {
      const returnNodes = declaration.body.body.filter(node => node.type === 'ReturnStatement');
      if (1 === returnNodes.length &&
          'ObjectExpression' === returnNodes[0].argument.type ) {
        return true;
      }
    }

    return false;
  });
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
  return file.path.includes( '/test/' );
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
  if ( isActionCreator( file, api, actionTypes ) ) {
    classifications.push( 'action-creator' );
  }

  if ( isDataLayerHandler( file, api, actionTypes ) ) {
    classifications.push( 'data-layer-handler' );
  }

  if ( isReducer( file, api, actionTypes ) ) {
    classifications.push( 'reducer' );
  }

  if ( isTestFile( file, api, actionTypes ) ) {
    classifications.push( 'test' );
  }

  if ( ! classifications.length ) {
    classifications.push( 'unknown' );
  }

  return output( { file: file.path, actionTypes, classifications } );
};

/**
 * This codeshift prints all action types used by specific files.
 */

const _ = require( 'lodash' );
const docblock = require( 'jest-docblock' );

module.exports = function ( file, api ) {
  const j = api.jscodeshift;
  const src = j( file.source );
  const declarations = src.find( j.ImportDeclaration );

  const node = declarations
    .nodes()
    .filter(node => node.source.value === 'state/action-types')[0];

  if ( ! node ) {
    return;
  }

  if ( ! node.specifiers[0].imported ) {
    console.log(JSON.stringify({ [ file.path ]: '*' }));
    return;
  }

  const actionTypes = node.specifiers.map( node => node.imported.name );
  console.log(JSON.stringify({ file: file.path, types: actionTypes }));
};

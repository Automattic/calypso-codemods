/**
 * This codeshift prints all action types used by specific files.
 */

const _ = require( 'lodash' );
const docblock = require( 'jest-docblock' );

module.exports = function ( file, api ) {
  const j = api.jscodeshift;
  const src = j( file.source );
  const exportDefaultNode = src.find( j.ExportDefaultDeclaration ).nodes()[0];

  // Assumpotion: a file exports handlers exports a default object.
  // The object is of the shape { [ ACTION_TYPE ]: [ ... ] }

  if ( ! exportDefaultNode ||
       exportDefaultNode.declaration.type !== 'ObjectExpression' ||
       src.find( j.ExportNamedDeclaration ).nodes().length !== 0 ) {
    return;
  }

  const exportObject = exportDefaultNode.declaration;

  // Check the "shape" of the exportObject

  const actionTypes = [];
  const isDataLayerHandler = exportObject.properties.every(({ key, value}) => {
    if (key.type !== 'Identifier' || value.type !== 'ArrayExpression') {
      return false;
    }

    actionTypes.push(key.name);
    return true;
  });

  if ( ! isDataLayerHandler) {
    return;
  }

  console.log(JSON.stringify({ file: file.path, types: actionTypes }));
};

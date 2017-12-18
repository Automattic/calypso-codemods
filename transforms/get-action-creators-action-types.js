/**
 * This codeshift prints all action types used by specific files.
 */

const _ = require( 'lodash' );
const docblock = require( 'jest-docblock' );

module.exports = function ( file, api ) {
  const j = api.jscodeshift;
  const src = j( file.source );

  // Assumpotion: a file exports named arrow functions and named functions only,
  // with no default.

  const declarationNodes = src.find( j.ExportNamedDeclaration ).nodes();

  if (! declarationNodes.length) {
    return;
  }

  const actionTypes = [];
  declarationNodes.forEach(({ declaration }) => {
    if (declaration.type !== 'VariableDeclaration' ||
        declaration.declarations.length !== 1 ||
        declaration.declarations[0].init.type !== 'ArrowFunctionExpression' ||
        declaration.declarations[0].init.body.type !== 'ObjectExpression' ) {
      return false;
    }

    const object = declaration.declarations[0].init.body;

    object.properties.forEach(({ key, value }) => {
      if (! key || key.name !== 'type' || ! value.name ) {
        return;
      }
      actionTypes.push(value.name);
    });

    return true;
  });

  if ( ! actionTypes.length ) {
    if (file.path.indexOf('actions') !== -1) {
      throw new Error('A file named ' + file.path + ' was not detected as an action creator. ' +
        'Check your code!');
    }
    return;
  }

  console.log(JSON.stringify({ file: file.path, types: actionTypes }));
};

/**
 * This transform add imports for the data layer middleware,
 * and the needed data layer handler, and call addCoreHandlers on it.
 */

function insertImportMiddlewareDeclaration( file, api, sourceStr ) {
  const j = api.jscodeshift;
  const source = j(sourceStr);

  const sourceDecs = source.find(j.ImportDeclaration, {
    source: { value: "state/data-layer/middleware" },
  });

  if ( sourceDecs.nodes().length ) {
    return;
  }

  const newImport = j.importDeclaration(
    [ j.importSpecifier( j.identifier( "addCoreHandlers" ), j.identifier( "addCoreHandlers" ) ) ],
    j.literal("state/data-layer/middleware"));

  const actionTypeDecs = source.find(j.ImportDeclaration, {
    source: { value: "state/action-types" },
  });

  j(actionTypeDecs.paths()[0]).insertAfter([ newImport ]);

  return source.toSource();
}

module.exports = function ( file, api ) {
  let sourceStr = file.source;
  sourceStr = insertImportMiddlewareDeclaration( file, api, sourceStr );
  //sourceStr = insertImportHandlersDeclaration( file, api, sourceStr );
  //sourceStr = insertAddCoreHandler( file, api, sourceStr );
  return sourceStr;
};


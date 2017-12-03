const _ = require("lodash");

// return default export if it exists, else return false
const getDefaultExport = (j, src) => {
	const defaultExportCollection = src.find(j.ExportDefaultDeclaration);
	return defaultExportCollection.length === 1
		? defaultExportCollection.nodes()[0].declaration
		: false;
};

// const getNamedExports = (j, src) => {
// 	const namedExportsCollection = src.find(j.ExportNamedDeclaration);
// 	return namedExportsCollection.nodes();
// };

const createNamedExport = (j, name, value) => {
	const declaration = j.exportNamedDeclaration(
		j.variableDeclaration("const", [j.variableDeclarator(j.identifier(name), value)])
	);
	return declaration;
};

module.exports = function(file, api) {
	const j = api.jscodeshift;
	const src = j(file.source);

	const defaultExport = getDefaultExport(j, src);

	// return early if no default export or if it isn't an object
	if (!defaultExport || defaultExport.type !== "ObjectExpression") {
		return;
	}

	/*
   * There are a few kinds of items that could appear as the value within an object. 
   * Literals, Identifiers, and Expressions.
   * 
   * An example of an object with just literals would be: { a: 'hi', b: 4, c: new Map() }
   * An object with just Identifiers would be: { a: a, b: b, c: c }
   * An object with an expression could be: { a: function() {} }
   * 
   * They need to be handled separately.  For literals and expressions we need to fully extract the declarations
   * For Identifiers we can hopefully find where they are actually declared and prepend export
   */
	const [alreadyDeclaredProperties, declaredInDefaultExport] = _.partition(
		defaultExport.properties,
		property => property.value.type === "Identifier"
	);

	alreadyDeclaredProperties.forEach(property => {
		const name = property.key.name;
		src
			.findVariableDeclarators(name) // the [declarator] is const [declarator1,declarator2];
			.map(node => node.parent) // since we need to put export before the whole construct we need the parent which contains the const as well
			.filter(declaration => declaration.parent.value.type !== "ExportNamedDeclaration") // skip if already being exported
			.replaceWith(variableDeclaration => {
				const declarations = variableDeclaration.value.declarations.map(declaration =>
					createNamedExport(j, declaration.id.name, declaration.init)
				);
				return declarations;
			});
	});

	const newExports = declaredInDefaultExport.map(property => {
		return createNamedExport(j, property.key.name, property.value);
	});

	return src
		.find(j.ExportDefaultDeclaration)
		.replaceWith(newExports)
		.toSource();
};
const _ = require("lodash");

// return default export if it exists, else return false
const getDefaultExport = (j, src) => {
	const defaultExportCollection = src.find(j.ExportDefaultDeclaration);
	return defaultExportCollection.length === 1
		? defaultExportCollection.nodes()[0].declaration
		: false;
};

// if the file has scary things in the default export, lets skip the transform
const scaryStuff = new Set([
	"componentWillUpdate",
	"componentWillMount",
	"componentWillUnmount",
	"componentWillReceiveProps",
	"render",
]);

// { render() { return "scary property" } }
const hasScaryProperties = (j, src) => {
	const defaultExport = getDefaultExport(j, src);
	return _.some(defaultExport.properties, property => scaryStuff.has(property.key.name));
};

// { [ 'thisIsALiteralKey': 42 ] }
const hasLiteralKeys = (j, src) => {
	const defaultExport = getDefaultExport(j, src);
	return _.some(defaultExport.properties, property => property.key.type === "Literal");
};

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
	if (
		!defaultExport ||
		defaultExport.type !== "ObjectExpression" ||
		hasLiteralKeys(j, src) ||
		hasScaryProperties(j, src)
	) {
		return file.source;
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
			.find(j.Declaration, { id: { name } })
			.filter(declaration => declaration.parent.value.type !== "ExportNamedDeclaration") // skip if already being exported
			.filter(
				declaration =>
					declaration.value.type === "FunctionDeclaration" ||
					declaration.value.type === "VariableDeclaration"
			)
			.replaceWith(declaration => {
				// if a function, then just prepend export
				if (declaration.value.type === "FunctionDeclaration") {
					return j.exportNamedDeclaration(declaration.value);
				}

				// if a variable declaration, then may need to deal with multiple variables
				// i.e. const a = 5, b = 6;
				const declarations = declaration.map(declarator =>
					createNamedExport(j, declarator.id.name, declarator.init)
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

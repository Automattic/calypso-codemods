// return default export if it exists, else return false
const getDefaultExport = (j, src) => {
	const defaultExportCollection = src.find(j.ExportDefaultDeclaration);
	return defaultExportCollection.length === 1
		? defaultExportCollection.nodes()[0].declaration
		: false;
};

const getNamedExports = (j, src) => {
	const namedExportsCollection = src.find(j.ExportNamedDeclaration);
	return namedExportsCollection.nodes();
};

const createNamedExportFromProperty = (j, property) => {
	const name = property.key.name;
	const value = property.value.value;

	const exportNamedDeclaration = j.exportNamedDeclaration(
		j.variableDeclaration("const", [j.variableDeclarator(j.identifier(name), property.value)])
	);
	return exportNamedDeclaration;
};

module.exports = function(file, api) {
	const j = api.jscodeshift;
	const src = j(file.source);

	const defaultExport = getDefaultExport(j, src);

	// return early if no default export or if it isn't an object
	if (!defaultExport || defaultExport.type !== "ObjectExpression") {
		return;
	}

	const namedExports = getNamedExports(j, src);

	const newExports = defaultExport.properties.map(property => {
		return createNamedExportFromProperty(j, property);
	});

	return src
		.find(j.ExportDefaultDeclaration)
		.replaceWith(newExports)
		.toSource();
};

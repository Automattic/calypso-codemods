const formatPragmaRegex = /^[\*\s]*@format[\*\s]*$/i;

export default function transformer(file, api) {
  const j = api.jscodeshift;

  return j(file.source)
    .find(j.Comment, node => node.value.includes('@format'))
    .forEach(node => {
      const comment = node.value.value;

      if (formatPragmaRegex.test(node.value.value)) {
        j(node).remove();
      } else {
        node.value.value = node.value.value
          .split('\n')
          .filter(line => !formatPragmaRegex.test(line))
          .join('\n');
      }
    })
    .toSource();
}

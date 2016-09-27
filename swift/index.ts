import * as fs from 'fs';
import * as path from 'path';
import * as nunjucks from 'nunjucks';
import * as _ from 'lodash';
import { swagger, segments } from '../common/swagger';


const pascalCase = (str: string): string => {
  return _.upperFirst(_.camelCase(str));
}

const engine = nunjucks.configure(path.join(__dirname, 'views'), {
  autoescape: false,
  trimBlocks: true,
  lstripBlocks: true,
});

const get_type = (type, ref, items) => {
  if (!type) {
    return _.last<string>(ref.split('/')).replace(/\./g, '_');
  }
  if (type === 'string') {
    return 'String';
  }
  if (type === 'boolean') {
    return 'Bool';
  }
  if (type === 'integer') {
    return 'Int';
  }
  if (type === 'array') {
    return '[' + _.upperFirst(_.last<string>((items.type || items.$ref).split('/')).replace(/\./g, '_')) + ']';
  }
  throw RangeError(`Unknown field type: "${type}"`);
}

const format = (str: string): string => {
  let indent = 0;
  let result = '';
  for (const line of str.replace(/\s+$/mg, '').replace(/\n{2,}/g, '\n').split('\n').map(item => item.trim())) {
    if (line == '}') {
      indent -= 4;
    }
    result += _.repeat(' ', indent) + line + '\n';
    if (line.endsWith('{')) {
      indent += 4;
    }
  }
  return result;
}

const generate_definitions = (output: string) => {
  const definitions = Object.keys(swagger.definitions).map((key) => {
    const name = key.replace(/\./g, '_');
    const properties = swagger.definitions[key].properties;
    const fields = Object.keys(properties).map((name) => {
      const { type, description, $ref, items } = properties[name];

      return { name, type: get_type(type, $ref, items), description };
    });
    return { name, fields };
  });
  const code = engine.render('Definitions.swift', { definitions });
  fs.writeFileSync(path.join(output, 'Definitions.swift'), format(code));
}

const generate_paths = (output: string) => {
  for (const segment of segments) {
    const className = pascalCase(segment);
    const code = engine.render('Path.swift', { segment, className });
    fs.writeFileSync(path.join(output, `${className}.swift`), format(code));
  }
}

const generate = (output: string) => {
  generate_definitions(output);
  generate_paths(output);
}


export { generate };
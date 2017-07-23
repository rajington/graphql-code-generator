import { registerHelper } from 'handlebars';
import { camelCase, pascalCase, snakeCase, titleCase } from 'change-case';
import { oneLineTrim } from 'common-tags';
import {
  SelectionSetFieldNode,
  Argument,
  Field,
  SchemaTemplateContext,
  SelectionSetFragmentSpread,
  Variable
} from 'graphql-codegen-core';
import { getFieldTypeAsString } from './field-type-to-string';
import { sanitizeFilename } from './sanitizie-filename';
import { FlattenModel, FlattenOperation } from './types';
import { flattenSelectionSet } from './flatten-types';
import { GeneratorConfig } from 'graphql-codegen-generators';

export const initHelpers = (config: GeneratorConfig, schemaContext: SchemaTemplateContext) => {
  registerHelper('toPrimitive', function (type) {
    return config.primitives[type] || type || '';
  });

  registerHelper('times', function (n, block) {
    let accum = '';

    for (let i = 0; i < n; ++i) {
      accum += block.fn(i);
    }

    return accum;
  });

  registerHelper('ifDirective', function (context: any, directiveName: string, options: { fn: Function, data: { root: any } }) {
    if (context && context['directives'] && directiveName && typeof directiveName === 'string') {
      const directives = context['directives'];
      const directiveValue = directives[directiveName];

      if (directiveValue) {
        return options.fn ? options.fn(directiveValue) : '';
      }
    }

    return '';
  });

  registerHelper('unlessDirective', function (context: any, directiveName: string, options: { fn: Function, data: { root: any } }) {
    if (context && context['directives'] && directiveName && typeof directiveName === 'string') {
      const directives = context['directives'];
      const directiveValue = directives[directiveName];

      if (!directiveValue) {
        return options.fn ? options.fn(directiveValue) : '';
      }
    }

    return '';
  });

  registerHelper('toComment', function (str) {
    if (!str || str === '') {
      return '';
    }

    return '/* ' + oneLineTrim`${str || ''}` + ' */';
  });

  registerHelper('eachImport', function (context: any, options: { fn: Function }) {
    let ret = '';
    const imports: { name: string; file: string; }[] = [];

    // Interface, input types, types
    if (context.fields && !context.onType && !context.operationType) {
      context.fields.forEach((field: Field) => {
        if (!config.primitives[field.type]) {
          if (field.type === context.name) {
            return;
          }

          const fieldType = getFieldTypeAsString(field);
          const file = sanitizeFilename(field.type, fieldType);

          if (!imports.find(t => t.name === field.type)) {
            imports.push({ name: field.type, file });
          }
        }

        // Fields arguments
        if (field.arguments && field.hasArguments) {
          field.arguments.forEach((arg: Argument) => {
            if (!config.primitives[arg.type]) {
              const fieldType = getFieldTypeAsString(arg);
              const file = sanitizeFilename(arg.type, fieldType);

              if (!imports.find(t => t.name === arg.type)) {
                imports.push({ name: arg.type, file });
              }
            }
          });
        }
      });
    }

    // Types that uses interfaces
    if (context.interfaces) {
      context.interfaces.forEach((infName: string) => {
        const file = sanitizeFilename(infName, 'interface');

        if (!imports.find(t => t.name === infName)) {
          imports.push({ name: infName, file });
        }
      });
    }

    // Unions
    if (context.possibleTypes) {
      context.possibleTypes.forEach((possibleType: string) => {
        const file = sanitizeFilename(possibleType, 'type');

        if (!imports.find(t => t.name === possibleType)) {
          imports.push({ name: possibleType, file });
        }
      });
    }

    if (context.variables) {
      context.variables.forEach((variable: Variable) => {
        if (!config.primitives[variable.type]) {
          const fieldType = getFieldTypeAsString(variable);
          const file = sanitizeFilename(variable.type, fieldType);

          if (!imports.find(t => t.name === variable.type)) {
            imports.push({ name: variable.type, file });
          }
        }
      });
    }

    // Operations and Fragments
    if (context.selectionSet) {
      const flattenDocument: FlattenOperation = context.isFlatten ? context : flattenSelectionSet(context);
      flattenDocument.innerModels.forEach((innerModel: FlattenModel) => {
        if (innerModel.fragmentsSpread && innerModel.fragmentsSpread.length > 0) {
          innerModel.fragmentsSpread.forEach((fragmentSpread: SelectionSetFragmentSpread) => {
            const file = sanitizeFilename(fragmentSpread.fragmentName, 'fragment');

            if (!imports.find(t => t.name === fragmentSpread.fragmentName)) {
              imports.push({ name: fragmentSpread.fragmentName, file });
            }
          });
        }

        innerModel.fields.forEach((field: SelectionSetFieldNode) => {
          if (!config.primitives[field.type]) {
            let type = null;

            if (field.isEnum) {
              type = 'enum';
            } else if (field.isInputType) {
              type = 'input-type';
            } else if (field.isScalar) {
              type = 'scalar';
            }

            if (type !== null) {
              const file = sanitizeFilename(field.type, type);

              if (!imports.find(t => t.name === field.type)) {
                imports.push({ name: field.type, file });
              }
            }
          }
        });
      });
    }

    for (let i = 0, j = imports.length; i < j; i++) {
      ret = ret + options.fn(imports[i], {
        data: {
          withExtension: imports[i] + '.' + config.filesExtension,
        },
      });
    }

    return ret;
  });

  registerHelper('toLowerCase', function (str) {
    return (str || '').toLowerCase();
  });

  registerHelper('toUpperCase', function (str) {
    return (str || '').toUpperCase();
  });

  registerHelper('toPascalCase', function (str) {
    return pascalCase(str || '');
  });

  registerHelper('toSnakeCase', function (str) {
    return snakeCase(str || '');
  });

  registerHelper('toTitleCase', function (str) {
    return titleCase(str || '');
  });

  registerHelper('toCamelCase', function (str) {
    return camelCase(str || '');
  });

  registerHelper('multilineString', function (str) {
    if (!str) {
      return '';
    }

    const lines = str.split('\n');

    return lines.map((line, index) => {
      const isLastLine = index != lines.length - 1;

      return `"${line.replace(/"/g, '\\"')}"` + (isLastLine ? ' +' : '');
    }).join('\r\n');
  });

  registerHelper('for', function (from, to, incr, block) {
    let accum = '';

    for (let i = from; i < to; i += incr) {
      accum += block.fn(i);
    }

    return accum;
  });
};
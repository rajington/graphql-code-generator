import {
  SelectionSetNode,
  GraphQLSchema,
  Kind,
  FieldNode,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLList
} from 'graphql';
import { inspect } from 'util';

const p = o => inspect(o, { showHidden: false, depth: null });

export class SelectionSetToObject {
  private _primitiveFields: string[] = [];
  private _primitiveAliasedFields: { alias: string; fieldName: string }[] = [];
  private _linksFields: { alias: string; name: string; type: string; selectionSet: string; rawType: any }[] = [];

  constructor(
    private _scalarsMap,
    private _schema: GraphQLSchema,
    private _parentSchemaType: GraphQLObjectType,
    private _selectionSet: SelectionSetNode
  ) {}

  _getBaseType(type: any): GraphQLObjectType {
    if (type instanceof GraphQLNonNull || type instanceof GraphQLList) {
      return this._getBaseType(type.ofType);
    } else {
      return type;
    }
  }

  _collectField(field: FieldNode) {
    const schemaField = this._parentSchemaType.getFields()[field.name.value];
    const baseType = this._getBaseType(schemaField.type);
    const typeName = baseType.name;

    if (this._scalarsMap[typeName]) {
      if (field.alias && field.alias.value) {
        this._primitiveAliasedFields.push({
          fieldName: field.name.value,
          alias: field.alias.value
        });
      } else {
        this._primitiveFields.push(field.name.value);
      }
    } else {
      const selectionSetToObject = new SelectionSetToObject(
        this._scalarsMap,
        this._schema,
        baseType,
        field.selectionSet
      );

      this._linksFields.push({
        alias: field.alias ? field.alias.value : null,
        name: field.name.value,
        type: typeName,
        selectionSet: selectionSetToObject.string,
        rawType: baseType
      });
    }
  }

  get string(): string {
    if (!this._selectionSet || !this._selectionSet.selections || this._selectionSet.selections.length === 0) {
      return '';
    }

    const { selections } = this._selectionSet;

    for (const selection of selections) {
      switch (selection.kind) {
        case Kind.FIELD:
          this._collectField(selection as FieldNode);
      }
    }

    const baseFields = this._primitiveFields.length
      ? `$Pick<${this._parentSchemaType.name}, { ${this._primitiveFields
          .map(fieldName => `${fieldName}: *`)
          .join(', ')} }>`
      : null;
    const linksFields = this._linksFields.length
      ? `{ ${this._linksFields.map(field => `${field.alias || field.name}: ${field.selectionSet}`).join(', ')} }`
      : null;
    const aliasBaseFields = this._primitiveAliasedFields.length
      ? `{ ${this._primitiveAliasedFields
          .map(
            aliasedField =>
              `${aliasedField.alias}: $ElementType<${this._parentSchemaType}, '${aliasedField.fieldName}'>`
          )
          .join(', ')} }`
      : null;
    const fieldsSet = [baseFields, aliasBaseFields, linksFields].filter(f => f);

    return `(${fieldsSet.join(' & ')})`;
  }
}

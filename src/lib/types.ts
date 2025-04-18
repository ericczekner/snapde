export type field = {
	name: string;
	type: string;
	length: string;
	precision?: string;
	scale?: string;
	isPrimaryKey: boolean;
	isNullable: boolean;
	defaultValue: string;
};

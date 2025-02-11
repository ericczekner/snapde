export type field = {
	name: string;
	type: string;
	length: string;
	precision?: string;
	scale?: string;
	isPrimaryKey: boolean;
	isNullable: boolean;
	defaultValue: string;
	fromTemplate: boolean;
};

export type templateType = {
	name: string;
	customerKey: string;
	description?: string;
	isSendable?: boolean;
	isTestable?: boolean;
	SendableCustomObjectField?: string;
	SendableSubscriberField?: string;
	DataRetentionPeriodLength?: string;
	DataRetentionPeriodUnitOfMeasure?: string;
	ResetRetentionPeriodOnImport?: boolean;
	RowBasedRetention?: boolean;
	DeleteAtEndOfRetentionPeriod?: boolean;
	RetainUntil?: string;
};

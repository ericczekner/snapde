//Helper functions
export const isCsv = (file: any) => {
	const validMimeTypes = [
		"text/csv",
		"application/vnd.ms-excel",
	];
	return (
		validMimeTypes.includes(file.type) ||
		file.name.endsWith(".csv")
	);
};

export const guessFieldType = (
	columnData: string[],
	columnHeader: string
): string => {
	// Regex patterns for different types
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const phoneRegex = /^\+?1?\d{10,15}$|^\d{10,15}$/; // Matches phone numbers with or without country code
	const dateRegex =
		/^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$|^\d{2}\/\d{2}\/\d{2}$|^\d{2}\/\d{2}\/\d{4} \d{1,2}:\d{2}(AM|PM)$/i;
	const localeRegex = /^[a-z]{2}-[a-z]{2}$/i; // Matches en-US, fr-FR, en-us, en-ca
	const numberRegex = /^-?\d+(,\d{3})*(\.\d+)?$/;

	// Trim values
	const trimmedData = columnData.map((value) =>
		value.trim()
	);

	// Check for Boolean
	const isBoolean = trimmedData.every((value) =>
		["true", "false", "1", "0", "yes", "no"].includes(
			value.toLowerCase()
		)
	);
	if (isBoolean) return "Boolean";

	// Check for Email
	const isEmail = trimmedData.every((value) =>
		emailRegex.test(value)
	);
	if (isEmail) return "EmailAddress";

	// Check for Phone based on column header
	if (columnHeader.toLowerCase().includes("phone")) {
		return "Phone";
	}

	// Check for Phone based on regex
	const isPhone = trimmedData.every((value) =>
		phoneRegex.test(value)
	);
	if (isPhone) return "Phone";

	// Check for Date
	const isDate = trimmedData.every((value) =>
		dateRegex.test(value)
	);

	if (isDate) return "Date";

	// Check for Locale
	const isLocale = trimmedData.every((value) =>
		localeRegex.test(value)
	);
	if (isLocale) return "Locale";

	// Check for Decimal
	const isDecimal = trimmedData.every(
		(value) =>
			!isNaN(parseFloat(value.replace(/,/g, ""))) &&
			value.includes(".")
	);
	if (isDecimal) return "Decimal";

	// Check for Number
	const isNumber = trimmedData.every((value) =>
		numberRegex.test(value)
	);

	if (isNumber) return "Number";

	// Default to Text
	return "Text";
};

//helper function to ensure the DE name is properly formatted
export const validateDeName = (
	name: string
): string | null => {
	if (name.startsWith("_")) {
		return "The DE name cannot begin with an underscore.";
	}
	if (/^\d+$/.test(name)) {
		return "The DE name cannot be only numbers.";
	}
	if (/[!@#$%^*()[\]{}\\|:'",<>./?+=]/.test(name)) {
		return "The DE name cannot contain special characters.";
	}
	if (name.length > 128) {
		return "The DE name cannot be more than 128 characters long.";
	}
	return null;
};

export const validateFieldName = (
	name: string
): string | null => {
	if (name.startsWith("_")) {
		return "The field name cannot begin with an underscore.";
	}
	if (/^\d+$/.test(name)) {
		return "The field name cannot be only numbers.";
	}
	if (/[!@#$%^*()[\]{}\\|:'",<>./?+=]/.test(name)) {
		return "The field name cannot contain special characters.";
	}
	return null;
};

import { NextRequest, NextResponse } from "next/server";

async function getToken() {
	const authURL =
		"https://mcbf8s0h5zzztdqn8-zf3kc5pvb4.auth.marketingcloudapis.com/v2/token";
	const payload = {
		grant_type: "client_credentials",
		client_id: "3gmzeu2sklbmycgptuq902rm",
		client_secret: "NGAv65JeDOdRtPJzXRpk1bxy",
		account_id: "7224602",
	};

	const req = await fetch(authURL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	const res = await req.json();

	return res.access_token;
}

export async function POST(req: NextRequest) {
	const { deConfig, file } = await req.json();
	const { name } = deConfig;
	console.log("deConfig", deConfig);
	const payload = {
		name: name,
		key: "",
		isActive: true,
		isSendable: deConfig.isSendable || false,
		isTestable: deConfig.isTestable || false,
		categoryId: deConfig.folderId,
		sendableCustomObjectField: deConfig.isSendable
			? deConfig.subscriberKey
			: "",
		sendableSubscriberField: "_SubscriberKey",
		fields: deConfig.fields.map(
			(field: any, index: number) => {
				return {
					name: field.name,
					type: field.type,
					length:
						field.type === "Decimal"
							? parseInt(field.precision)
							: parseInt(field.length) || null,
					ordinal: index,
					scale:
						field.type === "Decimal"
							? parseInt(field.scale)
							: null,
					isPrimaryKey: field.isPrimaryKey || false,
					isNullable: field.isNullable || true,
					defaultValue: field.defaultValue || null,
					isTemplateField: false,
					isInheritable: false,
					isOverridable: true,
					isHidden: false,
					isReadOnly: false,
					mustOverride: false,
				};
			}
		),
	};

	const primaryKeyFields = payload.fields.filter(
		(field: any) => field.isPrimaryKey
	);
	const uploadBody: string[] = [];
	if (primaryKeyFields.length > 0) {
		primaryKeyFields.forEach((field: any) => {
			field.isNullable = false;
			uploadBody.push(field.name);
		});
	}

	const token = await getToken();
	try {
		const createReq = await fetch(
			`https://mcbf8s0h5zzztdqn8-zf3kc5pvb4.rest.marketingcloudapis.com/data/v1/customobjects/`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(payload),
			}
		);
		const createRes = await createReq.json();

		if (createRes.errorcode === 30004) {
			return NextResponse.json({
				ok: false,
				status: 400,
				error:
					"Data extension with this name already exists",
			});
		}

		const deKey = createRes.key;
		let response = {
			ok: true,
			deCreated: true,
			status: 200,
			dataUploaded: false,
			message: "",
		};

		const hasPrimaryKeys = deConfig.fields.some(
			(field: any) => field.isPrimaryKey === true
		);

		const uploadURL = hasPrimaryKeys
			? `https://mcbf8s0h5zzztdqn8-zf3kc5pvb4.rest.marketingcloudapis.com/hub/v1/dataevents/key:${deKey}/rowset`
			: `https://mcbf8s0h5zzztdqn8-zf3kc5pvb4.rest.marketingcloudapis.com/data/v1/async/dataextensions/key:${deKey}/rows`;
		const uploadBody: any[] = [];
		let uploadPayload;

		if (hasPrimaryKeys) {
			file.forEach((row: any) => {
				const keys: { [key: string]: any } = {};
				const values: { [key: string]: any } = {};

				Object.entries(row).forEach(([key, value]) => {
					let cleanedValue =
						typeof value === "string"
							? value.replaceAll(",", "")
							: value;

					const fieldConfig = deConfig.fields.find(
						(field: any) =>
							field.name.toLowerCase() === key.toLowerCase()
					);

					if (
						fieldConfig &&
						fieldConfig.type === "Number"
					) {
						cleanedValue = Number(cleanedValue);
					}

					// Use default value if the value is empty or undefined
					if (
						(cleanedValue === "" ||
							cleanedValue === undefined) &&
						fieldConfig &&
						fieldConfig.defaultValue
					) {
						cleanedValue = fieldConfig.defaultValue;
					}

					if (
						primaryKeyFields.some(
							(field: any) =>
								field.name.toLowerCase() ===
								key.toLowerCase()
						)
					) {
						keys[key] = cleanedValue;
					} else {
						values[key] = cleanedValue;
					}
				});

				uploadBody.push({ keys, values });
			});
			uploadPayload = uploadBody;
		} else {
			const items = file.map((row: any) => {
				const values: { [key: string]: any } = {};
				Object.entries(row).forEach(([key, value]) => {
					let cleanedValue =
						typeof value === "string"
							? value.replaceAll(",", "")
							: value;

					const fieldConfig = deConfig.fields.find(
						(field: any) =>
							field.name.toLowerCase() === key.toLowerCase()
					);

					if (
						fieldConfig &&
						fieldConfig.type === "Number"
					) {
						cleanedValue = Number(cleanedValue);
					}

					// Use default value if the value is empty or undefined
					if (
						(cleanedValue === "" ||
							cleanedValue === undefined) &&
						fieldConfig &&
						fieldConfig.defaultValue
					) {
						cleanedValue = fieldConfig.defaultValue;
					}

					values[key] = cleanedValue;
				});
				return values;
			});
			uploadPayload = { items };
		}
		const uploadReq = await fetch(uploadURL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(uploadPayload),
		});

		if (!uploadReq.ok) {
			console.log("Error uploading data!");
			response.dataUploaded = false;
			response.message =
				"An error occurred when uploading data to the data extension";

			return NextResponse.json(response);
		}

		const uploadRes = await uploadReq.json();

		if (uploadRes.errorcode || uploadRes.errorcode === 0) {
			response.dataUploaded = false;
			if (uploadRes.errorcode === 10006) {
				response.message =
					"Unable to save rows for data extension. Check the data types of the fields and try again.";
			} else {
				response.message = uploadRes.message;
			}
		} else {
			response.dataUploaded = true;
		}

		return NextResponse.json(response);
	} catch (err: any) {
		console.log(err);
		return NextResponse.json({
			error:
				"An error occurred when creating the data extension",
		});
	}
}

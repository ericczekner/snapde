import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
	const { deConfig, file } = await req.json();
	const { name, dataLength } = deConfig;

	const { accessToken, restURL } = await getSession();

	console.log("Token: ", accessToken);

	// Define the response structure
	let response = {
		ok: false,
		deCreated: false,
		dataUploaded: false,
		status: 400,
		message: "",
	};

	try {
		// Create Data Extension Payload
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
					console.log(field);
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
						isPrimaryKey: field.isPrimaryKey ? true : false,
						isNullable: field.isNullable ? true : false,
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

		// Create Data Extension Request
		const createReq = await fetch(
			`${restURL}/data/v1/customobjects/`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify(payload),
			}
		);
		const createRes = await createReq.json();
		console.log("Create Res: ", createRes);
		// Handle creation errors
		if (createRes.errorcode === 30004) {
			return NextResponse.json({
				ok: false,
				status: 400,
				error:
					"Data extension with this name already exists",
			});
		} else if (!createReq.ok) {
			return NextResponse.json({
				ok: false,
				status: 500,
				error:
					"An error occurred when creating the data extension. Please try refreshing and try again.",
			});
		}

		// Capture the DE key
		const deKey = createRes.key;
		response.deCreated = true;
		response.ok = true;
		response.status = 200;

		// Case 4: No file data provided → Skip Upload
		if (!file || file.length === 0) {
			response.message =
				"Data Extension created successfully. No data was uploaded because no file was provided.";
			return NextResponse.json(response);
		}

		// Case 3: If dataLength > 35,000, skip the upload process
		if (dataLength > 35000) {
			response.message =
				"Data Extension created successfully. However, the data was not uploaded due to the large number of rows. You will need to upload the data manually.";
			return NextResponse.json(response);
		}

		// Prepare Data Upload Request
		const hasPrimaryKeys = deConfig.fields.some(
			(field: any) => field.isPrimaryKey === true
		);
		const uploadURL = hasPrimaryKeys
			? `${restURL}/hub/v1/dataevents/key:${deKey}/rowset`
			: `${restURL}/data/v1/async/dataextensions/key:${deKey}/rows`;

		// Transform file data into proper format
		const uploadBody: any[] = [];
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

				if (fieldConfig && fieldConfig.type === "Number") {
					cleanedValue = Number(cleanedValue);
				}

				if (
					(cleanedValue === "" ||
						cleanedValue === undefined) &&
					fieldConfig?.defaultValue
				) {
					cleanedValue = fieldConfig.defaultValue;
				}

				if (fieldConfig?.isPrimaryKey) {
					keys[key] = cleanedValue;
				} else {
					values[key] = cleanedValue;
				}
			});

			uploadBody.push(
				hasPrimaryKeys ? { keys, values } : values
			);
		});

		console.log("upload url: ", uploadURL);

		const uploadReq = await fetch(uploadURL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify(
				hasPrimaryKeys ? uploadBody : { items: uploadBody }
			),
		});

		const uploadRes = await uploadReq.json();
		console.log("Upload Res: ", uploadRes);

		if (!uploadReq.ok) {
			response.message =
				"An error occurred when uploading data to the data extension";
			return NextResponse.json(response);
		}

		if (uploadRes.errorcode) {
			response.dataUploaded = false;
			response.message =
				uploadRes.errorcode === 10006
					? "Unable to save rows for data extension. Check the data types of the fields and try again."
					: uploadRes.message;
		} else {
			response.dataUploaded = true;
			response.message = "Data uploaded successfully.";
		}

		return NextResponse.json(response);
	} catch (err: any) {
		console.log("Error: ", err);
		return NextResponse.json({
			ok: false,
			status: 500,
			error:
				"An error occurred when creating the data extension",
		});
	}
}

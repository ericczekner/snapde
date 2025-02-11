import { NextRequest, NextResponse } from "next/server";
import { parseStringPromise } from "xml2js";

async function getToken() {
	const tenant = process.env.SFMC_TENANT;
	const client_id = process.env.SFMC_CLIENT_ID;
	const client_secret = process.env.SFMC_CLIENT_SECRET;
	const account_id = process.env.SFMC_ACCOUNT_ID;
	const authURL = `https://${tenant}.auth.marketingcloudapis.com/v2/token`;
	const payload = {
		grant_type: "client_credentials",
		client_id: client_id,
		client_secret: client_secret,
		account_id: account_id,
	};

	const req = await fetch(authURL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	if (!req.ok) {
		throw new Error(
			`Token request failed with status ${req.status}`
		);
	}

	const res = await req.json();
	return res.access_token;
}

export async function GET(
	req: NextRequest
): Promise<NextResponse> {
	const tenant = process.env.SFMC_TENANT;
	const soapEndpoint = `https://${tenant}.soap.marketingcloudapis.com/Service.asmx`;
	const accessToken = await getToken();

	const soapRequest = `
        <s:Envelope xmlns:s='http://www.w3.org/2003/05/soap-envelope' xmlns:a='http://schemas.xmlsoap.org/ws/2004/08/addressing' xmlns:u='http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd'>
            <s:Header>
                <a:Action s:mustUnderstand='1'>Retrieve</a:Action>
                <a:To s:mustUnderstand='1'>${soapEndpoint}</a:To>
                <fueloauth xmlns='http://exacttarget.com'>${accessToken}</fueloauth>
            </s:Header>
            <s:Body xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:xsd='http://www.w3.org/2001/XMLSchema'>
                <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
                    <RetrieveRequest>
                        <ObjectType>DataExtensionTemplate</ObjectType>
                        <Properties>Name</Properties>
                        <Properties>CustomerKey</Properties>
                        <Properties>Description</Properties>
                        <Properties>IsSendable</Properties>
                        <Properties>IsTestable</Properties>
                        <Properties>SendableCustomObjectField</Properties>
                        <Properties>SendableSubscriberField</Properties>
                        <Properties>DataRetentionPeriodLength</Properties>
                        <Properties>DataRetentionPeriodUnitOfMeasure</Properties>
                        <Properties>ResetRetentionPeriodOnImport</Properties>
                        <Properties>RowBasedRetention</Properties>
                        <Properties>DeleteAtEndOfRetentionPeriod</Properties>
                        <Properties>RetainUntil</Properties>
                        <Properties>ObjectID</Properties>
                    </RetrieveRequest>
                </RetrieveRequestMsg>
            </s:Body>
        </s:Envelope>`;

	try {
		const response = await fetch(soapEndpoint, {
			method: "POST",
			headers: {
				"Content-Type": "text/xml",
				SOAPAction: "Retrieve",
			},
			body: soapRequest,
		});

		if (!response.ok) {
			throw new Error(
				`SOAP request failed with status ${response.status}`
			);
		}
		const xml = await response.text();
		const result = await parseStringPromise(xml);
		const soapBody = result["soap:Envelope"]["soap:Body"];
		const retrieveResponseMsg =
			soapBody[0].RetrieveResponseMsg[0];
		const results = retrieveResponseMsg.Results;

		const formattedResults = results.map((item: any) => {
			const partnerProperties =
				item.PartnerProperties.reduce(
					(acc: any, prop: any) => {
						acc[prop.Name[0]] = prop.Value[0];
						return acc;
					},
					{}
				);

			return {
				name: item.Name[0],
				key: item.CustomerKey[0],
				description: item.Description[0],
				isSendable: partnerProperties.IsSendable,
				isTestable: partnerProperties.IsTestable,
				objectId: item.ObjectID[0],
				SendableCustomObjectField:
					partnerProperties.SendableCustomObjectField,
				SendableSubscriberField:
					partnerProperties.SendableSubscriberField,
				DataRetentionPeriodLength:
					partnerProperties.DataRetentionPeriodLength,
				DataRetentionPeriodUnitOfMeasure:
					partnerProperties.DataRetentionPeriodUnitOfMeasure,
				ResetRetentionPeriodOnImport:
					partnerProperties.ResetRetentionPeriodOnImport,
				RowBasedRetention:
					partnerProperties.RowBasedRetention,
				DeleteAtEndOfRetentionPeriod:
					partnerProperties.DeleteAtEndOfRetentionPeriod,
				RetainUntil: partnerProperties.RetainUntil,
			};
		});

		console.log(formattedResults);

		return NextResponse.json(formattedResults);
	} catch (error) {
		return NextResponse.json(error);
	}
}

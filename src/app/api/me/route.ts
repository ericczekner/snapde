import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { parseStringPromise } from "xml2js";

export async function GET() {
	try {
		const { accessToken, restURL, soapURL } =
			await getSession();

		// Step 1: Get token context to fetch MID
		const contextRes = await fetch(
			`${restURL}/platform/v1/tokenContext`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			}
		);
		const contextData = await contextRes.json();
		const mid = contextData.organization.id;

		// Step 2: Build SOAP request to retrieve BU name
		const soapRequest = `
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing">
  <s:Header>
    <a:Action s:mustUnderstand="1">Retrieve</a:Action>
    <a:To s:mustUnderstand="1">${soapURL}/Service.asmx</a:To>
    <fueloauth xmlns="http://exacttarget.com">${accessToken}</fueloauth>
  </s:Header>
  <s:Body>
    <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <RetrieveRequest>
        <ObjectType>BusinessUnit</ObjectType>
        <Properties>ID</Properties>
        <Properties>Name</Properties>
        <Filter xsi:type="SimpleFilterPart" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
          <Property>ID</Property>
          <SimpleOperator>equals</SimpleOperator>
          <Value>${mid}</Value>
        </Filter>
      </RetrieveRequest>
    </RetrieveRequestMsg>
  </s:Body>
</s:Envelope>`;

		// Step 3: Send the SOAP request
		const soapRes = await fetch(`${soapURL}/Service.asmx`, {
			method: "POST",
			headers: {
				"Content-Type": "text/xml",
				SOAPAction: "Retrieve",
			},
			body: soapRequest,
		});
		const soapText = await soapRes.text();
		console.log("SOAP Response: ", soapText);
		const soapParsed = await parseStringPromise(soapText, {
			explicitArray: false,
		});

		const bu =
			soapParsed["soap:Envelope"]["soap:Body"][
				"RetrieveResponseMsg"
			]["Results"];

		return NextResponse.json({
			ok: true,
			mid,
			buName: bu?.Name || "Unknown BU",
		});
	} catch (err) {
		console.error("Error fetching BU info:", err);
		return NextResponse.json({
			ok: false,
			error: "Failed to fetch MID or BU name",
		});
	}
}

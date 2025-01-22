import { NextRequest, NextResponse } from "next/server";
import { parseStringPromise } from "xml2js";

// Type for a single folder
export interface Folder {
	id: string;
	name: string;
	contentType: string;
	parentFolder: {
		id: string;
		name: string;
	} | null;
	children: Folder[]; // Added for the hierarchical tree
}

// Type for the SOAP response parsing
interface SoapResponse {
	"soap:Envelope": {
		"soap:Body": {
			RetrieveResponseMsg: {
				Results: any; // Use 'any' type to handle the raw SOAP response
			};
		};
	};
}

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
	const soapEndpoint =
		"https://mcbf8s0h5zzztdqn8-zf3kc5pvb4.soap.marketingcloudapis.com/Service.asmx";
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
                <ObjectType>DataFolder</ObjectType>
                <Properties>ID</Properties>
                <Properties>Name</Properties>
                <Properties>ContentType</Properties>
                <Properties>ParentFolder.Name</Properties>
                <Properties>ParentFolder.ID</Properties>
                <Filter xsi:type="SimpleFilterPart">
                    <Property>ContentType</Property>
                    <SimpleOperator>equals</SimpleOperator>
                    <Value>dataextension</Value>
                </Filter>
            </RetrieveRequest>
        </RetrieveRequestMsg>
    </s:Body>
</s:Envelope>
  `;

	try {
		const response = await fetch(soapEndpoint, {
			method: "POST",
			headers: {
				"Content-Type": "text/xml",
				SOAPAction: "Retrieve",
			},
			body: soapRequest,
		});

		const responseText = await response.text();

		if (!response.ok) {
			return NextResponse.json({
				error: `SOAP request failed with status ${response.status}`,
			});
		}

		const folderTree: Folder[] = await parseSoapResponse(
			responseText
		);
		return NextResponse.json(folderTree);
	} catch (error) {
		return NextResponse.json({
			error:
				"An error occurred when retrieving the folders",
		});
	}
}

// Helper function to parse XML SOAP response
async function parseSoapResponse(
	xml: string
): Promise<Folder[]> {
	const parsed: SoapResponse = await parseStringPromise(
		xml,
		{
			explicitArray: false,
		}
	);

	const results =
		parsed["soap:Envelope"]["soap:Body"].RetrieveResponseMsg
			.Results;

	// Ensure results are always an array for consistency
	const folders = Array.isArray(results)
		? results
		: [results];

	// Simplify and clean up the folder data
	const cleanedFolders: Folder[] = folders.map(
		(folder: any) => ({
			id: folder.ID,
			name: folder.Name,
			contentType: folder.ContentType,
			parentFolder: folder.ParentFolder
				? {
						id: folder.ParentFolder.ID,
						name: folder.ParentFolder.Name,
				  }
				: null,
			children: [], // Initialize children as an empty array
		})
	);

	// Build the folder tree
	return buildFolderTree(cleanedFolders);
}

function buildFolderTree(folders: Folder[]): Folder[] {
	const folderMap = new Map<string, Folder>();

	// Initialize all folders in a map
	folders.forEach((folder) => {
		folderMap.set(folder.id, { ...folder, children: [] });
	});

	const tree: Folder[] = [];

	folders.forEach((folder) => {
		const parent = folderMap.get(
			folder.parentFolder?.id || ""
		);
		if (parent) {
			parent.children.push(folderMap.get(folder.id)!);
		} else {
			// Root-level folder
			tree.push(folderMap.get(folder.id)!);
		}
	});

	return tree;
}

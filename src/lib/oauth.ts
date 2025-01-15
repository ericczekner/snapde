import axios from "axios";

const SFMC_AUTH_URL =
	"https://mcbf8s0h5zzztdqn8-zf3kc5pvb4.auth.marketingcloudapis.com/v2/token";

type Credentials = {
	clientId: string;
	clientSecret: string;
};

export async function getAccessToken(
	mid: string
): Promise<string> {
	try {
		const credentials = await fetchClientCredentials(mid);
		console.log("Credentials: ", credentials);
		const response = await axios.post(SFMC_AUTH_URL, {
			grant_type: "client_credentials",
			client_id: credentials.clientId,
			client_secret: credentials.clientSecret,
		});

		return response.data.access_token;
	} catch (err: any) {
		console.error("Error getting access token: ", err);
		throw new Error("Error getting access token");
	}
}

const credentialsMap: Record<string, Credentials> = {
	business_unit_id_1: {
		clientId: "client_id_1",
		clientSecret: "client_secret_1",
	},
	business_unit_id_2: {
		clientId: "client_id_2",
		clientSecret: "client_secret_2",
	},
};

async function fetchClientCredentials(
	mid: string
): Promise<Credentials> {
	// Replace this with logic to dynamically fetch credentials for the given MID

	if (!credentialsMap[mid]) {
		throw new Error(`No credentials found for MID: ${mid}`);
	}

	return credentialsMap[mid];
}

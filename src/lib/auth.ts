import axios from "axios";

export async function getStackInfo(
	hostname: string
): Promise<{
	stack: string;
	urlEtmc: string;
	urlMcapp: string;
} | null> {
	const match = hostname.match(
		/mc\.(s\d+)\.exacttarget\.com/
	);

	if (hostname === "localhost") {
		return {
			stack: "s7",
			urlEtmc: `https://mc.s7.exacttarget.com`,
			urlMcapp: `https://mc.s7.marketingcloudapps.com`,
		};
	}

	if (!match) {
		return null; // Return null if stack cannot be determined
	}

	const stack = match[1];
	return {
		stack,
		urlEtmc: `https://mc.${stack}.exacttarget.com`,
		urlMcapp: `https://mc.${stack}.marketingcloudapps.com`,
	};
}

export async function validateUser(
	urlEtmc: string
): Promise<any | null> {
	const endpoint = `${urlEtmc}/cloud/fuelapi/legacy/v1/beta/organization/user/@me`;

	try {
		const response = await axios.get(endpoint, {
			withCredentials: true,
		});
		return response.data; // Return user data if successful
	} catch (err: any) {
		if (err.response?.status === 404) {
			console.error(
				"User not logged in or session invalid."
			);
			return null; // Return null for 404 error
		}

		console.error("Error validating user:", err);
		return null; // Return null for other errors
	}
}

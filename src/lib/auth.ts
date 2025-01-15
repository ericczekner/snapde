import axios from "axios";

export async function getParentHostname(): Promise<
	string | null
> {
	try {
		// Check if app is running inside an iframe
		if (window.self === window.top) {
			console.error(
				"The app is not running inside an iframe."
			);
			return null;
		}

		// Attempt to access the parent frame's hostname
		try {
			return window.parent.location.hostname;
		} catch {
			console.warn(
				"Direct access to parent hostname is restricted. Falling back to postMessage."
			);
			return await getParentHostnameViaPostMessage();
		}
	} catch (err) {
		console.error(
			"Unable to access the parent frame's hostname:",
			err
		);
		return null;
	}
}

export async function getParentHostnameViaPostMessage(): Promise<
	string | null
> {
	return new Promise((resolve) => {
		const timeout = setTimeout(() => resolve(null), 3000); // Timeout after 3 seconds

		const messageHandler = (event: MessageEvent) => {
			if (
				typeof event.data === "string" &&
				event.data.includes("exacttarget.com")
			) {
				clearTimeout(timeout);
				window.removeEventListener(
					"message",
					messageHandler
				);
				resolve(event.data);
			}
		};

		window.addEventListener("message", messageHandler);
		window.parent.postMessage("getHostname", "*");
	});
}

export async function getStackInfo(): Promise<{
	stack: string;
	urlEtmc: string;
	urlMcapp: string;
} | null> {
	const hostname = await getParentHostname();
	if (!hostname) {
		console.error(
			"Unable to retrieve the parent hostname."
		);
		return null;
	}

	const match = hostname.match(
		/mc\.(s\d+)\.exacttarget\.com/
	);
	if (!match) {
		console.error(
			"Unable to determine stack from hostname:",
			hostname
		);
		return null;
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

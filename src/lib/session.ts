import { cookies } from "next/headers";
import crypto from "crypto";

const algorithm = "aes-256-cbc";
const key = process.env.ENCRYPTION_KEY
	? Buffer.from(process.env.ENCRYPTION_KEY, "base64")
	: undefined;

function decrypt(encrypted: string) {
	if (!key) throw new Error("Missing encryption key");
	const [ivHex, encryptedHex] = encrypted.split(":");
	const iv = Buffer.from(ivHex, "hex");
	const encryptedText = Buffer.from(encryptedHex, "hex");
	const decipher = crypto.createDecipheriv(
		algorithm,
		key,
		iv
	);
	const decrypted = Buffer.concat([
		decipher.update(encryptedText),
		decipher.final(),
	]);
	return decrypted.toString();
}

function encrypt(text: string) {
	if (!key) throw new Error("Missing encryption key");
	const iv = crypto.randomBytes(16);
	const cipher = crypto.createCipheriv(algorithm, key, iv);
	const encrypted = Buffer.concat([
		cipher.update(text),
		cipher.final(),
	]);
	return `${iv.toString("hex")}:${encrypted.toString(
		"hex"
	)}`;
}

function isExpired(session: any): boolean {
	// Refresh 1 min before actual expiration
	const bufferMs = 60 * 1000;
	return Date.now() >= session.tokenExpiresAt - bufferMs;
}

export async function getSession(): Promise<{
	session: any;
	accessToken: string;
	restURL: string;
	soapURL: string;
}> {
	const cookieStore = await cookies();
	const encryptedSession =
		cookieStore.get("sessionToken")?.value;
	if (!encryptedSession)
		throw new Error("Not authenticated");

	let session = JSON.parse(decrypt(encryptedSession));

	// Normalize URLs
	session.soapURL = session.soapURL?.replace(/\/+$/, "");
	session.restURL = session.restURL?.replace(/\/+$/, "");
	session.authURL = session.authURL?.replace(/\/+$/, "");

	// Refresh token if expired
	if (isExpired(session)) {
		const tokenResp = await fetch(
			`${session.authURL}/v2/token`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					grant_type: "refresh_token",
					client_id: session.clientId,
					refresh_token: session.refreshToken,
				}),
			}
		);

		if (!tokenResp.ok) {
			const text = await tokenResp.text();
			console.error(
				"Token refresh failed:",
				tokenResp.status,
				text
			);
			throw new Error(
				`Token refresh failed with status ${tokenResp.status}`
			);
		}

		const newToken = await tokenResp.json();

		if (newToken.error) {
			throw new Error(
				"Failed to refresh token: " +
					newToken.error_description
			);
		}

		// Update session
		session.accessToken = newToken.access_token;
		session.refreshToken =
			newToken.refresh_token || session.refreshToken;
		session.tokenExpiresAt =
			Date.now() + newToken.expires_in * 1000;

		// Save updated session
		const updatedEncrypted = encrypt(
			JSON.stringify(session)
		);
		cookieStore.set({
			name: "sessionToken",
			value: updatedEncrypted,
			httpOnly: true,
			secure: true,
			path: "/",
		});
	}

	return {
		session,
		accessToken: session.accessToken,
		restURL: session.restURL,
		soapURL: session.soapURL,
	};
}

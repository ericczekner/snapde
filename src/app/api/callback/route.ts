import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";

const algorithm = "aes-256-cbc";
const key = process.env.ENCRYPTION_KEY
	? Buffer.from(process.env.ENCRYPTION_KEY, "base64")
	: undefined;
const iv = process.env.ENCRYPTION_IV
	? Buffer.from(process.env.ENCRYPTION_IV, "base64")
	: undefined;

if (!key || !iv) {
	throw new Error(
		"Encryption key and IV must be defined in environment variables"
	);
}

function encrypt(text: string) {
	if (!key || !iv) {
		throw new Error(
			"Encryption key and IV must be defined"
		);
	}
	let cipher = crypto.createCipheriv(algorithm, key, iv);
	let encrypted = cipher.update(text);
	encrypted = Buffer.concat([encrypted, cipher.final()]);
	return (
		iv.toString("hex") + ":" + encrypted.toString("hex")
	);
}

function decrypt(text: string) {
	if (!key) {
		throw new Error(
			"Encryption key and IV must be defined"
		);
	}
	let textParts = text.split(":");
	let iv = Buffer.from(textParts.shift() as string, "hex");
	let encryptedText = Buffer.from(
		textParts.join(":"),
		"hex"
	);
	let decipher = crypto.createDecipheriv(
		algorithm,
		key,
		iv
	);
	let decrypted = decipher.update(encryptedText);
	decrypted = Buffer.concat([decrypted, decipher.final()]);
	return decrypted.toString();
}

export async function GET(request: NextRequest) {
	const cookieStore = await cookies();

	const code = request.nextUrl.searchParams.get("code");
	const authURI = cookieStore.get("authURI");
	const clientId = cookieStore.get("clientId");
	const error = request.nextUrl.searchParams.get("error");

	console.log("Error: ", error);
	if (error === "user_not_licensed") {
		redirect("/?error=user_not_licensed");
	}

	if (!authURI || !clientId || !code) {
		redirect("/");
	}

	//todo: add in error handling when a user passes an incorrect client id or auth uri
	try {
		// use the code to generate a new SFMC token
		const tokenResponse = await fetch(
			`${authURI.value}/v2/token`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					grant_type: "authorization_code",
					client_id: clientId.value,
					code: code,
					redirect_uri:
						"https://snapde.vercel.app/api/callback",
				}),
			}
		);

		const data = await tokenResponse.json();

		if (data.error) {
			throw new Error(data.error_description);
		}
		// Create a JSON object with the values
		const sessionData = {
			accessToken: data.access_token,
			refreshToken: data.refresh_token,
			restURL: data.rest_instance_url,
			soapURL: data.soap_instance_url,
			authURL: authURI.value,
			clientId: clientId.value,
			tokenExpiresAt: Date.now() + data.expires_in * 1000,
		};

		// Convert the JSON object to a string
		const sessionDataString = JSON.stringify(sessionData);

		// Encrypt the JSON string
		const encryptedSessionData = encrypt(sessionDataString);

		// Store the encrypted string as a cookie
		cookieStore.set({
			name: "sessionToken",
			value: encryptedSessionData,
			httpOnly: true,
			secure: true,
		});

		const decryptedSessionDataString = decrypt(
			encryptedSessionData
		);

		// Parse the decrypted string back to a JSON object
		const decryptedSessionData = JSON.parse(
			decryptedSessionDataString
		);

		console.log(
			"Decrypted session data: ",
			decryptedSessionData
		);

		cookieStore.delete("authURI");
		cookieStore.delete("clientId");
	} catch (e) {
		console.log("error: ", e);
	}
	return redirect("/");
}

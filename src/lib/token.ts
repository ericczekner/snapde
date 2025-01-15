import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.SECRET_KEY || "secret";

export function generateSessionToken(data: {
	mid: string;
	userId: string;
}): string {
	const payload = {
		mid: data.mid,
		userId: data.userId,
		timestamp: new Date().toISOString(),
	};
	return jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" });
}

export function verifySessionToken(
	token: string
): { mid: string; userId: string } | null {
	try {
		const decoded = jwt.verify(token, SECRET_KEY) as {
			mid: string;
			userId: string;
		};
		return decoded;
	} catch (err) {
		console.error("Error verifying session token:", err);
		return null;
	}
}

export function validateSfmcJwt(
	token: string
): { mid: string; userId: string } | null {
	try {
		const decoded = jwt.verify(
			token,
			process.env.SFMC_SIGNING_SECRET!
		) as any;
		const mid = decoded.context.businessUnit.mid;
		const userId = decoded.sub; // Extract user ID from JWT
		return { mid, userId };
	} catch (err) {
		console.error("Error validating SFMC JWT:", err);
		return null;
	}
}

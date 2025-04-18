import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
	const { clientId, authURI } = await request.json();
	console.log("Ready to login: ", clientId);
	console.log("Ready to login: ", authURI);
	const authRedirectURL = `${authURI}/v2/authorize?client_id=${clientId}&response_type=code&redirect_uri=https://snapde.vercel.app/api/callback`;
	const cookieStore = await cookies();
	cookieStore.set("authURI", authURI);
	cookieStore.set("clientId", clientId);

	console.log(authRedirectURL);
	return NextResponse.json({
		status: "ok",
		authRedirectURL: authRedirectURL,
	});
}

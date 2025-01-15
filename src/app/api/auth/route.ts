import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/oauth";

export async function POST(req: NextRequest) {
	const sfmcContext = req.cookies.get("sfmcContext");
	console.log("SFMC Context: ", sfmcContext);
	if (!sfmcContext) {
		return NextResponse.error();
	}

	const { mid } = JSON.parse(sfmcContext.value || "{}");
	console.log("MID: ", mid);
	try {
		const accessToken = await getAccessToken(mid);
		return NextResponse.json({ accessToken });
	} catch (err: any) {
		console.error("Error getting access token: ", err);
		return NextResponse.error();
	}
}

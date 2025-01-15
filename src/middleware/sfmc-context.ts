import { NextRequest, NextResponse } from "next/server";
import { validateSfmcJwt } from "@/lib/token";
import jwt from "jsonwebtoken";

export function middleware(req: NextRequest) {
	const sfmcJwt = req.nextUrl.searchParams.get("jwt");

	if (!sfmcJwt) {
		return NextResponse.redirect("/login");
	}

	try {
		const decoded = jwt.verify(
			sfmcJwt,
			process.env.SFMC_SIGNING_SECRET!
		) as any;

		const userContext = JSON.stringify(decoded.context);

		// Correct way to set cookies with options
		const response = NextResponse.next();
		response.cookies.set("sfmcContext", userContext, {
			httpOnly: true,
			secure: true,
		});
		return response;
	} catch (error) {
		console.error("Error verifying SFMC JWT:", error);
		return NextResponse.redirect("/login");
	}
}

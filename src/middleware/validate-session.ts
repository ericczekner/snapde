import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
	const sfmcContext = req.cookies.get("sfmcContext");

	if (!sfmcContext) {
		return NextResponse.redirect("/login");
	}

	return NextResponse.next();
}

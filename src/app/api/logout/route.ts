import { cookies } from "next/headers";

import { NextResponse } from "next/server";

export async function GET() {
	const cookieStore = await cookies();
	cookieStore.delete("sessionToken");

	return NextResponse.json({ status: "ok" });
}

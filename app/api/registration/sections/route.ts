import { NextResponse } from "next/server";
import { getMockRegistrationSections } from "@/lib/registration/mock";

export async function GET() {
  try {
    return NextResponse.json(getMockRegistrationSections());
  } catch (error) {
    console.error("Error fetching registration sections:", error);
    return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
  }
}


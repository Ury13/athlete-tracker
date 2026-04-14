import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // Only seed if no users exist
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      return NextResponse.json(
        { message: "Database already has users. Skipping seed." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash("athletiq123", 12);

    const user = await prisma.user.create({
      data: {
        email: "admin@athletiq.com",
        name: "Admin Athlete",
        passwordHash,
      },
    });

    return NextResponse.json({
      message: "Seed complete. Default user created.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed database." },
      { status: 500 }
    );
  }
}

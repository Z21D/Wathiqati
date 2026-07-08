import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { sendWelcomeEmailOnce, uniqueSlug } from "@/lib/auth/onboarding";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { name, email, password, organizationName } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const slug = await uniqueSlug(organizationName);

    const createdUserId = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          password: hashedPassword,
          companyName: organizationName,
          notificationEmail: normalizedEmail,
          emailRemindersEnabled: true,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
        },
      });

      await tx.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "OWNER",
        },
      });

      return user.id;
    });

    await sendWelcomeEmailOnce({
      userId: createdUserId,
      name,
      email: normalizedEmail,
      organizationName,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

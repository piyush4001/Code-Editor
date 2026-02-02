"use server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { Templates, Playground } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { pl } from "date-fns/locale";

export const toggleStarMarked = async (
  playgroundId: string,
  isChecked: boolean
) => {
  const session = await auth();
  const userId = session?.userId;
  if (!userId) {
    throw new Error("User Id is required");
  }
  try {
    if (isChecked) {
      await db.starMark.create({
        data: {
          userId: userId!,
          playgroundId,
          isMarked: isChecked,
        },
      });
    } else {
      await db.starMark.delete({
        where: {
          userId_playgroundId: {
            userId,
            playgroundId: playgroundId,
          },
        },
      });
    }

    revalidatePath("/dashboard");
    return { success: true, isMarked: isChecked };
  } catch (error) {
    console.log(error);
    return { sucess: false, error: "Failed to update Problem" };
  }
};
export const getAllPlaygroundForUser = async () => {
  const session = await auth();

  if (!session?.userId) {
    return [];
  }

  try {
    const playground = await db.playground.findMany({
      where: {
        userId: session.userId,
      },
      include: {
        user: true,
        Starmark: true,
      },
    });
    return playground;
  } catch (error) {
    console.log("Error fetching playgrounds:", error);
    return [];
  }
};

export const createPlayground = async (data: {
  title: string;
  template: Templates;
  description?: string;
}): Promise<Playground | null> => {
  const session = await auth();

  const { template, title, description } = data;

  if (!session?.userId) {
    console.log("User not authenticated");
    return null;
  }

  try {
    const playground = await db.playground.create({
      data: {
        title: title,
        description: description || "",
        template: template,
        userId: session.userId,
      },
    });
    revalidatePath("/dashboard");
    return playground;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const deleteProjectById = async (id: string) => {
  try {
    await db.playground.delete({
      where: {
        id,
      },
    });
    revalidatePath("/dashboard");
  } catch (error) {
    console.log(error);
  }
};

export const duplicateProjectById = async (id: string) => {
  try {
    const originalPlayground = await db.playground.findUnique({
      where: {
        id,
      },
    });
    if (!originalPlayground) {
      throw new Error("Original Playground not found");
    }
    const duplicatedPlayground = await db.playground.create({
      data: {
        title: `${originalPlayground.title} (Copy)`,
        description: originalPlayground.description,
        template: originalPlayground.template,
        userId: originalPlayground.userId,
      },
    });

    revalidatePath("/dashboard");
    return duplicatedPlayground;
  } catch (error) {
    console.log(error);
  }
};

export const editProjectById = async (
  id: string,
  data: {
    title: string;
    description: string;
  }
) => {
  try {
    await db.playground.update({
      where: {
        id,
      },
      data: data,
    });
    revalidatePath("/dashboard");
  } catch (error) {
    console.log(error);
  }
};

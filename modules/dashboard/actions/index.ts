"use server";
import { db } from "@/lib/db";
import { currentUser } from "@/modules/auth/actions";
import { Templates, Playground } from "@prisma/client";
import { revalidatePath } from "next/cache";

export const getAllPlaygroundForUser = async()=>{
    const user  = await currentUser();

    try {
        const playground = await db.playground.findMany({
            where:{
                userId:user?.id
            },
            include:{
                user:true
            }
        })
        return playground;
    } catch (error) {
        console.log("Error fetching playgrounds:", error);
    }
}

export const createPlayground = async (data:{
   title: string;
  template: Templates;
  description?: string;
}): Promise<Playground | null> =>{
    const user = await currentUser();

    const {template , title , description} = data;
    try {
        const playground = await db.playground.create({
             data: {
                title: title,
                description: description || "",
                template: template,
                userId: user?.id!,
      },
        });
        return playground;
    } catch (error) {
        console.log(error);
        return null;
    }
};

export const deleteProjectById = async (id:string)=>{
    try {
        await db.playground.delete({
            where:{
                id,
            },
        });
        revalidatePath("/dashboard");
    } catch (error) {
        console.log(error)
    }
}

export const duplicateProjectById = async(id:string)=>{
    try {
        const originalPlayground = await db.playground.findUnique({
            where:{
                id,
            },
        });
        if(!originalPlayground){
            throw new Error("Original Playground not found");
        }
        const duplicatedPlayground = await db.playground.create({
            data:{
                 title: `${originalPlayground.title} (Copy)`,
                description: originalPlayground.description,
                template: originalPlayground.template,
                userId: originalPlayground.userId,
            }
        })

        revalidatePath("/dashboard");
        return duplicatedPlayground;
    } catch (error) {
        console.log(error);
    }
}

export const editProjectById = async (id:string,
    data :{
        title:string, description:string
    }
)=>{
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
}




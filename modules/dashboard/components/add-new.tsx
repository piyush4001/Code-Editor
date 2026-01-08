"use client";

import { Button } from "@/components/ui/button";
// import { createPlayground } from "@/features/playground/actions";
import { Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import TemplateSelectingModal from "./template-selecting-modal";
import { createPlayground } from "../actions";
import { Templates } from "@prisma/client";

const AddNewButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<{
    title: string;
    template: "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "HONO" | "ANGULAR";
    description?: string;
  } | null>(null);
  const router = useRouter();

  const handleSubmit = async (data: {
    title: string;
    template: "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "HONO" | "ANGULAR";
    description?: string;
  }) => {
    setSelectedTemplate(data);

    // Convert modal template type to Prisma Templates enum
    // EXPRESS is not in Prisma enum, so map it to HONO as a backend alternative
    const templateMap: Record<typeof data.template, Templates> = {
      REACT: Templates.REACT,
      NEXTJS: Templates.NEXTJS,
      EXPRESS: Templates.EXPRESS, // Map EXPRESS to HONO since EXPRESS isn't in Prisma enum
      VUE: Templates.VUE,
      HONO: Templates.HONO,
      ANGULAR: Templates.ANGULAR,
    };

    const res = await createPlayground({
      ...data,
      template: templateMap[data.template],
    });
    toast.success("Playground Created successfully");
    setIsModalOpen(false);
    router.push(`/playground/${res?.id}`);
  };

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="group bg-muted hover:bg-background flex cursor-pointer flex-row items-center justify-between rounded-lg border px-6 py-6 shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-all duration-300 ease-in-out hover:scale-[1.02] hover:border-[#E93F3F] hover:shadow-[0_10px_30px_rgba(233,63,63,0.15)]"
      >
        <div className="flex flex-row items-start justify-center gap-4">
          <Button
            variant={"outline"}
            className="flex items-center justify-center bg-white transition-colors duration-300 group-hover:border-[#E93F3F] group-hover:bg-[#fff8f8] group-hover:text-[#E93F3F]"
            size={"icon"}
          >
            <Plus
              size={30}
              className="transition-transform duration-300 group-hover:rotate-90"
            />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-[#e93f3f]">Add New</h1>
            <p className="text-muted-foreground max-w-55 text-sm">
              Create a new playground
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden">
          <Image
            src={"/add-new.svg"}
            alt="Create new playground"
            width={150}
            height={150}
            className="transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      </div>
      <TemplateSelectingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
};

export default AddNewButton;

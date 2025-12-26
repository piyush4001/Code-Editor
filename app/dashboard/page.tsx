import { getAllPlaygroundForUser } from "@/modules/dashboard/actions";
import AddRepo from "@/modules/dashboard/components/add-repo";
import EmptyState from "@/modules/dashboard/components/empty-state";
import AddNewButton from "@/modules/dashboard/components/add-new";
import ProjectTable from "@/modules/dashboard/components/project-table";
import type { Project } from "@/modules/dashboard/types";
import React from "react";

const Page = async () => {
  const playgrounds = await getAllPlaygroundForUser();
  // console.log("Playgrounds:", playgrounds);
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-start px-4 py-10">
      <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
        <AddNewButton />
        <AddRepo />
      </div>
      <div className="mt-10 flex w-full flex-col items-center justify-center">
        {playgrounds && playgrounds.length === 0 ? (
          <EmptyState />
        ) : (
          <ProjectTable projects={(playgrounds || []) as Project[]} />
        )}
      </div>
    </div>
  );
};

export default Page;

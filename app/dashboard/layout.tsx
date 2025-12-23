import { SidebarProvider } from "@/components/ui/sidebar";
import { getAllPlaygroundForUser } from "@/modules/dashboard/actions";
import { get } from "http";
import { DashboardSidebar}  from "@/modules/dashboard/components/dashboard-sidebar";

export default  async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {

  const playgroundData = await getAllPlaygroundForUser();

  const technologyIconMap: Record<string, string> = {
    REACT:"Zap",
    NEXTJS:"Lightbulb",
    EXPRESS:"Database",
    VUE:"Compass",
    ANGULAR:"Terminal",
    HONO:"FlameIcon"
  }

  const formattedPlayground = playgroundData?.map((item)=>({
    id:item.id,
    name:item.title,
    starred:false,
    icon: technologyIconMap[item.template] || "Code2",
  })) 
  return (

    <SidebarProvider>
    <div className="flex min-h-screen w-full overflow-x-hidden">
      <DashboardSidebar initialPlaygroundData={formattedPlayground || []}/>
      <main className="flex-1 ">
        {children}
        </main>
     
    </div>
     </SidebarProvider>
  );
}
import * as React from "react"
import Link from "next/link"
import { cookies } from "next/headers"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AppSidebar } from "@/components/custom/app-sidebar"
import BreadcrumbComponent from "./breadcrumb"
import { DatabaseZap } from "lucide-react"

export default async function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies()
  const defaultOpen = (cookieStore.get("sidebar:state")?.value || 'false') === "true"


  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={{ 
        "--sidebar-width": "12rem",
        "--sidebar-width-mobile": "20rem",
      } as React.CSSProperties}
    >
      <AppSidebar />
      <main className="w-full">
        <div className="flex items-center border-b h-12 px-3 gap-4 ">
          <SidebarTrigger />
          <BreadcrumbComponent />
        </div>
        <div className="min-h-12">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
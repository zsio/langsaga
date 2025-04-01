"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { DatabaseZap } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import React from "react";

export default function BreadcrumbComponent() {
  const router = useRouter();
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter((segment) => segment);

  const routesConfig = [
    {
      name: "项目",
      href: "/projects",
      icon: <DatabaseZap size={14} />,
    },
    {
      name: null,
      href: null,
    },
  ];

  const createBreadcrumbs = () => {
    return pathSegments.map((segment, index) => {
      const href = "/" + pathSegments.slice(0, index + 1).join("/");
      const isLast = index === pathSegments.length - 1;

      return (
        <React.Fragment key={segment + index}>
          <BreadcrumbItem>
            <BreadcrumbLink
              href={routesConfig[index]?.href || href}
              className="flex items-center gap-1"
            >
              {routesConfig[index]?.icon}
              {routesConfig[index]?.name || segment}
            </BreadcrumbLink>
          </BreadcrumbItem>
          {
            !isLast && <BreadcrumbSeparator />
          }
        </React.Fragment>
      );
    });
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {createBreadcrumbs()}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

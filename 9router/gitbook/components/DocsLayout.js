"use client";

import DocsHeader from "./DocsHeader";
import DocsSidebar from "./DocsSidebar";
import DocsToc from "./DocsToc";
import { DEFAULT_LANG } from "@/constants/languages";

export default function DocsLayout({ children, headings = [], lang = DEFAULT_LANG }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FCFBF9]">
      <DocsHeader lang={lang} />
      <div className="flex-1 flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <DocsSidebar lang={lang} />
        </div>
        
        <div className="flex-1 flex">
          {children}
          <DocsToc headings={headings} lang={lang} />
        </div>
      </div>
    </div>
  );
}

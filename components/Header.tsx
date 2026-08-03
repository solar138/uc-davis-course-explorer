'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header({ children } : { children : React.ReactNode }) {
    const pathname = usePathname();
    const parts = pathname.split("/");
    const prefix = parts.length == 2 ? "ucdavis/" : "";

    return <header className="h-14 border-b px-4 flex items-center bg-white z-10 border-gray-200 text-2xl font-bold w-full">
        {children}
        <div className="m-auto"></div>
        <div className="float-right flex gap-10 font-normal header-nav">
            <Link href={prefix + "scheduler"} className={parts[2] == "scheduler" ? "active" : ""}>Scheduler</Link>
            <Link href={prefix + "courses"} className={parts[2] == "courses" ? "active" : ""}>Explorer</Link>
            <Link href={prefix + "planner"} className={parts[2] == "planner" ? "active" : ""}>Planner</Link>
        </div>
    </header>
} 
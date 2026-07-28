import Image from "next/image";
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/ucdavis/scheduler");
  return (
    <div className="flex flex-col flex-1 items-center justify-center font-sans dark:bg-black">
      <main>
        
      </main>
    </div>
  );
}

import { SchoolProps } from "@/app/editor/[[...school]]/page";
import DegreeSearch from "@/components/DegreeSearch";
import { Footer } from "@/components/Footer";
import Header from "@/components/Header";
import getSchoolInfo from "@/lib/getSchoolInfo";
import { redirect } from "next/navigation";

export default async function CourseExplorer({ params } : SchoolProps ) {
  var args = await params;
  
  if (args.school == undefined ||args.school.length == 0) return "Please select a school";

  const schoolInfo = getSchoolInfo( (args).school[0] );

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden text-gray-900 bg-white">
      <Header> Course Explorer —  <span className="ml-2 text-gray-500">{schoolInfo.name}</span> </Header> 
      <main className="flex-1 flex overflow-hidden min-h-0">
        <DegreeSearch/>
      </main>
      <Footer/>
    </div>
  );
}


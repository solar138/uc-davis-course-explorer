import { SchoolProps } from "@/app/editor/[[...school]]/page";
import { DegreeInspector } from "@/components/DegreeInspector";
import DegreeSearch from "@/components/DegreeSearch";
import { Footer } from "@/components/Footer";
import Header from "@/components/Header";
import getSchoolInfo from "@/lib/getSchoolInfo";
import { notFound } from "next/navigation";

export default async function CourseExplorer({ params } : SchoolProps ) {
  var args = await params;
  if (args.school == undefined ||args.school.length == 0) return "Please select a school";

  const schoolInfo = await getSchoolInfo( args.school );

  if (schoolInfo == null) {
    notFound();
  }

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden text-gray-900 bg-white">
      <Header> Course Explorer —  <span className="ml-2 text-gray-500">{schoolInfo.shortName}</span> </Header> 
      <main className="flex-1 flex overflow-hidden min-h-0">
        <DegreeSearch school={schoolInfo}/>
        <DegreeInspector school={schoolInfo}/>
      </main>
      <Footer/>
    </div>
  );
}


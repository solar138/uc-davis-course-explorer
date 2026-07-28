import { DegreeInspector } from "@/components/DegreeInspector";
import DegreePlanner from "@/components/DegreePlanner";
import DegreeSearch from "@/components/DegreeSearch";
import { Footer } from "@/components/Footer";
import Header from "@/components/Header";
import getSchoolInfo from "@/lib/getSchoolInfo";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ school: string }> }): Promise<Metadata> {
  var args = await params;

  if (args.school == undefined || args.school.length == 0) return { title: "404 School Not Found" }

  const schoolInfo = await getSchoolInfo(args.school);

  if (schoolInfo == null) {
    notFound();
  }

  return {
    title: schoolInfo.shortName + " | Degree Planner",
    description: "Calculate exam credits, add transfers, and choose majors and minors."
  }
}


export default async function CourseExplorer({ params } : { params : Promise<{ school: string }> } ) {
  var args = await params;
  if (args.school == undefined ||args.school.length == 0) return "Please select a school";

  const schoolInfo = await getSchoolInfo( args.school );

  if (schoolInfo == null) {
    notFound();
  }

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden text-gray-900 bg-white">
      <Header> Degree Planner —  <span className="ml-2 text-gray-500">{schoolInfo.shortName}</span> </Header> 
      <main className="flex-1 flex overflow-hidden min-h-0">
        <DegreeSearch school={schoolInfo}/>
        <DegreePlanner school={schoolInfo}/>
        <DegreeInspector school={schoolInfo}/>
      </main>
      <Footer/>
    </div>
  );
}


import CourseGraph from "@/components/CourseGraph";
import { CourseInspector } from "@/components/CourseInspector";
import CourseSearch from "@/components/CourseSearch";
import { redirect } from "next/navigation";
import { Footer } from "../../../components/Footer";
import getSchoolCourses from "@/lib/getSchoolCourses";
import getSchoolInfo from "@/lib/getSchoolInfo";
import Header from "@/components/Header";

export default async function CourseExplorer({ params } : { params : Promise<{ school: string }> }) {
  var args = await params;
  
  if (args.school == undefined ||args.school.length == 0) return "Please select a school";

  const schoolInfo = await getSchoolInfo( (args).school );

  if (schoolInfo == null) {
    return "School not found or not supported: " + args.school;
  }

  const selectedCourse = args.school.length == 1 ? undefined : decodeURIComponent(args.school[1]).toUpperCase();

  if (selectedCourse != undefined && selectedCourse.indexOf(" ") >= 0) {
    // redirect 
    redirect("/courses/" + args.school[0] + "/" + selectedCourse.replaceAll(" ", ""));
  }

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden text-gray-900 bg-white">
      <Header> Course Explorer —  <span className="ml-2 text-gray-500">{schoolInfo.shortName}</span> </Header> 
      <main className="flex-1 flex overflow-hidden min-h-0">
          <CourseSearch school={schoolInfo}/>

          <div className="flex-1 relative bg-gray-100 p-4"><CourseGraph courses={[]} />
          </div>

          <CourseInspector courseId={selectedCourse} addTarget={"graph"} showUnlocks={true} />
      </main>
      <Footer/>
    </div>
  );
}


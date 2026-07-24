import { notFound, redirect } from "next/navigation";
import getSchoolCourses from "@/lib/getSchoolCourses";
import getSchoolInfo from "@/lib/getSchoolInfo";
import { CourseEditor } from "@/components/CourseEditor";
import Header from "@/components/Header";

export interface SchoolProps {
  params: Promise<{ school: string }>;
}

export default async function CourseExplorer({ params } : SchoolProps ) {
  var args = await params;
  
  if (args.school == undefined ||args.school.length == 0) return "Please select a school";

  const schoolInfo = await getSchoolInfo( (args).school );

  if (schoolInfo == null) {
    notFound();
  }
  
  const courses = await getSchoolCourses(schoolInfo);

  const selectedCourse = args.school.length == 1 ? undefined : decodeURIComponent(args.school[1]).toUpperCase();

  if (selectedCourse != undefined && selectedCourse.indexOf(" ") >= 0) {
    // redirect 
    redirect("/courses/" + args.school[0] + "/" + selectedCourse.replaceAll(" ", ""));
  }

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden text-gray-900 bg-white">
      <Header> Course Editor —  <span className="ml-2 text-gray-500">{schoolInfo.shortName}</span> </Header> 

      <CourseEditor courseLibrary={courses} courseCode={selectedCourse ?? ""}/>
      <footer className="flex-none h-8 border-t bg-gray-50 px-4 flex items-center border-gray-200 justify-between text-xs text-gray-500 z-10">
        <div className="flex gap-4">
          <span>Put some footer stuff here I guess.</span>
        </div>
        <div className="flex gap-4">
          <a className="cursor-pointer hover:text-blue-600" href="/help/course-explorer">Help</a>
        </div>
      </footer>
    </div>
  );
}
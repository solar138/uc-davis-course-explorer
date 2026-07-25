import CourseGraph from "@/components/CourseGraph";
import { CourseInspector } from "@/components/CourseInspector";
import CourseSearch from "@/components/CourseSearch";
import { notFound, redirect } from "next/navigation";
import { Footer } from "../../../components/Footer";
import getSchoolCourses from "@/lib/getSchoolCourses";
import getSchoolInfo from "@/lib/getSchoolInfo";
import { CourseSchedule } from "@/components/CourseSchedule";
import { useScheduleStore } from "@/store/useScheduleStore";
import CourseSectionList from "@/components/CourseSectionList";
import Header from "@/components/Header";

export default async function CourseScheduler({ params } : { params : Promise<{ school: string }> }) {
  var args = await params;
  
  if (args.school == undefined ||args.school.length == 0) return "Please select a school";

  const schoolInfo = await getSchoolInfo( args.school );

  if (schoolInfo == null) {
    notFound(); 
  }

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden text-gray-900 bg-white">
      <Header> Course Scheduler —  <span className="ml-2 text-gray-500">{schoolInfo.shortName}</span> </Header> 
      <main className="flex-1 flex overflow-hidden min-h-0">
          <CourseSearch school={schoolInfo}/>

          <div className="flex-1 relative bg-gray-100 p-4">
            <CourseSchedule/>
          </div>
          <CourseSectionList addTarget="schedule" schoolInfo={schoolInfo}/>
      </main>
      <Footer/>
    </div>
  );
}



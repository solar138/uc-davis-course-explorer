import CourseSearch from "@/components/CourseSearch";
import { notFound, redirect } from "next/navigation";
import { Footer } from "../../../components/Footer";
import getSchoolInfo from "@/lib/getSchoolInfo";
import { CourseSchedule } from "@/components/CourseSchedule";
import CourseSectionList from "@/components/CourseSectionList";
import Header from "@/components/Header";
import { Metadata } from "next";
import TermSelector from "@/components/TermSelector";


export async function generateMetadata({ params }: { params: Promise<{ school: string }> }): Promise<Metadata> {
  var args = await params;

  if (args.school == undefined || args.school.length == 0) return { title: "404 School Not Found" }

  const schoolInfo = await getSchoolInfo(args.school);

  if (schoolInfo == null) {
    notFound();
  }

  return {
    title: schoolInfo.shortName + " | Course Scheduler",
    description: "Automatically generate schedules from courses with customizable parameters."
  }
}

export default async function CourseScheduler({ params }: { params: Promise<{ school: string }> }) {
  var args = await params;

  if (args.school == undefined || args.school.length == 0) return "Please select a school";

  const schoolInfo = await getSchoolInfo(args.school);

  if (schoolInfo == null) {
    notFound();
  }

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden text-gray-900 bg-white">
      <Header> Course Scheduler —  <span className="ml-2 text-gray-500">{schoolInfo.shortName}</span> <TermSelector/> </Header>
      <main className="flex-1 flex overflow-hidden min-h-0">
        <CourseSearch school={schoolInfo} />

        <div className="flex-1 relative bg-gray-100 p-4">
          <CourseSchedule />
        </div>
        <CourseSectionList addTarget="schedule" schoolInfo={schoolInfo} />
      </main>
      <Footer />
    </div>
  );
}



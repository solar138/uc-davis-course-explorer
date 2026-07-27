import Image from "next/image";
import { notFound, redirect } from "next/navigation";

export default async function Redirect({ params } : { params : Promise<{ school: string, fallbackredirect: string[] }> }) {
  const path = await params;
  if (path.school == "courses") {
    if (path.fallbackredirect[1] == "scheduler") {
      redirect("/" + path.fallbackredirect[0] + "/scheduler");
    } else if (path.fallbackredirect.length == 1) {
      redirect("/" + path.fallbackredirect[0] + "/courses")
    }
  } else if (path.school = "planner") {
    redirect("/" + path.fallbackredirect[0] + "/planner");
  }
  notFound();
}

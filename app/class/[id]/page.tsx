import Link from "next/link";
import { notFound } from "next/navigation";

// Define the shape of our data based on the SQL query
interface Schedule {
  day: string;
  start_time: string;
  end_time: string;
  location: string;
}

interface Review {
  stars: number;
  text: string;
}

async function getClassDetails(id: string) {
  const baseUrl = process.env.MAIN_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/class/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to fetch class details");
  }

  return res.json();
}

export default async function ClassDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>; // <-- 1. Change type to Promise
}) {
  const resolvedParams = await params; // <-- 2. Await the params
  const classData = await getClassDetails(resolvedParams.id); // <-- 3. Use the resolved ID

  if (!classData) {
    notFound(); // Triggers Next.js 404 page
  }

  // Calculate spots remaining
  const spotsLeft = classData.max_num_students - classData.num_students_enrolled;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Back Button */}
      <Link href="/" className="text-blue-500 hover:underline">
        &larr; Back to Dashboard
      </Link>

      {/* Header Section */}
      <div className="bg-white shadow rounded-lg p-6 border-l-4 border-blue-600">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-semibold tracking-wide uppercase">
              {classData.department_name} • {classData.semester} {classData.year}
            </p>
            <h1 className="text-3xl font-bold mt-1">
              {classData.course_name}
            </h1>
            <p className="text-xl text-gray-600 mt-1">
              {classData.department_name.substring(0, 4).toUpperCase()} {classData.course_code} • {classData.credits} Credits
            </p>
          </div>
          <div className="text-right">
            <span
              className={`px-3 py-1 rounded-full text-sm font-bold ${
                spotsLeft > 0
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {spotsLeft > 0 ? `${spotsLeft} Spots Open` : "Waitlisted"}
            </span>
            <p className="text-sm text-gray-500 mt-2">
              Enrolled: {classData.num_students_enrolled} / {classData.max_num_students}
            </p>
          </div>
        </div>
      </div>

      {/* Grid for Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Instructor & Info Card */}
        <div className="bg-gray-50 rounded-lg p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold border-b pb-2 mb-4">Instructor</h2>
          <p className="text-lg font-medium">{classData.professor_name || "TBA"}</p>
          <p className="text-gray-600">{classData.professor_email}</p>
          
          <h2 className="text-xl font-bold border-b pb-2 mt-6 mb-4">Description</h2>
          <p className="text-gray-700 italic mb-2">{classData.class_description}</p>
          <p className="text-gray-600 text-sm">{classData.course_description}</p>
        </div>

        {/* Schedule Card */}
        <div className="bg-gray-50 rounded-lg p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold border-b pb-2 mb-4">Meeting Times</h2>
          {classData.schedule.length === 0 ? (
            <p className="text-gray-500">No schedule assigned yet.</p>
          ) : (
            <ul className="space-y-4">
              {classData.schedule.map((slot: Schedule, idx: number) => (
                <li key={idx} className="flex flex-col">
                  <span className="font-semibold text-blue-900">{slot.day}</span>
                  <span className="text-gray-700">
                    {slot.start_time} - {slot.end_time}
                  </span>
                  <span className="text-sm text-gray-500">📍 {slot.location}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Student Reviews</h2>
        {classData.reviews.length === 0 ? (
          <p className="text-gray-500 italic">No reviews yet for this class.</p>
        ) : (
          <div className="space-y-4">
            {classData.reviews.map((review: Review, idx: number) => (
              <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center mb-2">
                  {/* Render Stars */}
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={i < review.stars ? "text-yellow-400" : "text-gray-300"}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-gray-800">&quot;{review.text}&quot;</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
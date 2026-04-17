import ClassCard from "@/components/ClassCard";

export default async function Home() {
  try {
    // Fallback baseUrl to prevent crashes if env var is missing during dev
    const baseUrl = process.env.MAIN_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/class/top`, {
      cache: "no-store", // Ensures we always see fresh data
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch classes: ${response.statusText}`);
    }

    const classes = await response.json();

    return (
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section (Matches the style of the Details page) */}
        <div className="bg-white shadow-sm rounded-lg p-6 border-l-4 border-blue-600">
          <div>
            <p className="text-sm text-gray-500 font-semibold tracking-wide uppercase">
              University Dashboard
            </p>
            <h1 className="text-3xl font-bold mt-1 text-gray-900">
              Top Rated Classes
            </h1>
            <p className="text-lg text-gray-600 mt-1">
              Discover the highest-rated courses based on student reviews and average GPA.
            </p>
          </div>
        </div>

        {/* Grid Section */}
        {classes.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-12 text-center border border-gray-200 shadow-sm">
            <p className="text-gray-500 text-lg">No classes found in the database.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((c: any, i: number) => (
              <ClassCard
                key={c.id}
                id={c.id} // Added the ID back in case you are using it for the href link!
                position={i + 1}
                name={`${c.course_name} (${c.course_code})`}
                professor={c.professor_name || 'TBA'}
                semester={`${c.semester} ${c.year}`}
                averageRating={c.average_rating}
                average_gpa={c.average_gpa}
              />
            ))}
          </div>
        )}
      </div>
    );
  } catch (error: any) {
    console.error("Home Page Error:", error);
    
    // Styled Error State
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-md shadow-sm">
          <h3 className="text-red-800 font-bold text-xl mb-2">Critical Error</h3>
          <p className="text-red-600">{error.message}</p>
          <p className="text-red-500 text-sm mt-4">Check your terminal for more details.</p>
        </div>
      </div>
    );
  }
}
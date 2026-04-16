import ClassCard from "@/components/ClassCard";

export default async function Home() {
  try {
    // Fallback just in case MAIN_URL isn't setting properly in your .env
    const baseUrl = process.env.MAIN_URL || 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/class/top`, {
      cache: 'no-store' 
    });
    
    if (!response.ok) {
      // This will show on the screen if the API route returns a 500 error
      return <div className="p-4 text-red-500">API Error: {response.statusText}</div>;
    }
    
    const classes = await response.json();

    // Safety check: If it's not an array, show what it actually is!
    if (!Array.isArray(classes)) {
      console.log("API returned:", classes); // Look in your terminal!
      return <div className="p-4 text-red-500">Data error: Expected an array, check terminal.</div>;
    }

    return (
      <div className="grid grid-cols-3 gap-4 p-4">
        {classes.length === 0 ? (
           <p>No classes found in the database.</p>
        ) : (
          classes.map((c: any, i: number) => (
            <ClassCard
              key={c.id}
              position={i + 1}
              name={`${c.course_name} (${c.course_code})`}
              id={c.id}
              professor={c.professor_name || 'TBA'}
              semester={`${c.semester} ${c.year}`}
              averageRating={c.average_rating}
              average_gpa={c.average_gpa}
            />
          ))
        )}
      </div>
    );
  } catch (error: any) {
    // This catches network errors or fetch failures
    console.error("Home Page Error:", error);
    return <div className="p-4 text-red-500">Critical Error: {error.message}</div>;
  }
}
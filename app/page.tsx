import ClassCard from "@/components/ClassCard";

async function getTopClasses() {
  const response = await fetch(`${process.env.MAIN_URL}/api/class/top`);
  const data = await response.json();
  return data; 
}

export default async function Home() {
  const classes = await getTopClasses();
  return (
    <div className="grid grid-cols-3 gap-4">
      {classes.map((c: any, i: number) => (
        <ClassCard
          key={c.id}
          position={i + 1}
          name={c.course_id}
          id={c.id}
          professor={c.professor_id}
          semester={c.semester + ' ' + c.year}
          averageRating={c.average_rating}
          average_gpa={c.average_gpa}
        />
      ))}
    </div>
  );
}
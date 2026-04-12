async function getClassCourseData(id: string) {
  const response = await fetch(`${process.env.MAIN_URL}/api/class/${id}`);
  const data = await response.json();
  return data; 
}

async function ClassPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const c = await getClassCourseData(id);
  return (
    <main>
      <h1>{c.name}</h1>
      <p>{c.description}</p>
      <p>Credits: {c.credits}</p>
      <p>Department: {c.department_id}</p>
      <p>Average Rating: {c.average_rating}</p>
      <p>Professor: {c.professor}</p> #TODO: add professor table so that this works
    </main>
  );
}
export default ClassPage;

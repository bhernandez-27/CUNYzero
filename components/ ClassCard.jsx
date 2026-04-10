import PropTypes from 'prop-types';


function ClassCard(props){
    return (
    <div className="border-2 border-blue-500">
        <h1>Highest Rated Class #{props.position}</h1>
        <h2>Course Name: {props.name}</h2>
        <h2>id: {props.id}</h2>
        <h2>Professor: {props.professor}</h2>
        <h2> Semester: {props.semester}</h2>
        <h2> Average Rating: {props.averageRating} </h2>
        <h2> Average GPA: {props.average_gpa} </h2>
    </div> 
);
}

ClassCard.propTypes = {
    position: PropTypes.number,
    name: PropTypes.string,
    id: PropTypes.number,
    professor: PropTypes.string,
    semester: PropTypes.string,
    averageRating: PropTypes.number,
    average_gpa: PropTypes.number
};

ClassCard.defaultProps = {
    name: "TBA",
    id: 0,
    professor: "TBA",
    semester: "TBA",
    averageRating: 0,
    average_gpa: 0
};

export default ClassCard;


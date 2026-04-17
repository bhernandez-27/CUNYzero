import Link from "next/link";
import PropTypes from 'prop-types';

export default function ClassCard({
  id,
  position,
  name = "TBA",
  professor = "TBA",
  semester = "TBA",
  averageRating = 0,
  average_gpa = 0,
}) {
  return (
    // The whole card is a link that goes to your new dynamic page
    <Link href={`/class/${id}`} className="block group h-full">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 transition-all duration-200 hover:shadow-md hover:border-blue-400 hover:-translate-y-1 h-full flex flex-col justify-between">
        
        {/* Top Section */}
        <div>
          {/* Top Row: Rank & Semester */}
          <div className="flex justify-between items-start mb-4">
            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold tracking-wide uppercase border border-blue-100">
              #{position} Rated
            </span>
            <span className="text-sm font-medium text-gray-500">
              {semester}
            </span>
          </div>

          {/* Main Info */}
          <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
            {name}
          </h2>
          <p className="text-gray-600 mt-2 text-sm flex items-center gap-2">
            <span className="text-gray-400">🧑‍🏫</span> {professor}
          </p>
        </div>

        {/* Bottom Section: Stats Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
          
          {/* Rating Block */}
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">
              Rating
            </span>
            <div className="flex items-center gap-1">
              <span className="text-yellow-400 text-lg leading-none">★</span>
              <span className="font-bold text-gray-700 leading-none">
                {Number(averageRating).toFixed(1)}
              </span>
            </div>
          </div>

          {/* GPA Block */}
          <div className="flex flex-col items-end">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">
              Avg GPA
            </span>
            <div className="font-bold text-gray-700 leading-none">
              {Number(average_gpa).toFixed(2)}
            </div>
          </div>

        </div>
      </div>
    </Link>
  );
}

ClassCard.propTypes = {
  id: PropTypes.number.isRequired,
  position: PropTypes.number.isRequired,
  name: PropTypes.string,
  professor: PropTypes.string,
  semester: PropTypes.string,
  averageRating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  average_gpa: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
};
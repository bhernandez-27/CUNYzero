from sqlalchemy import text

#  calculate the average star rating for every class
# and sort from highest to lowest.
GET_TOP_RATED_CLASSES = text("""
    SELECT c.id, co.name, AVG(r.stars) as avg_rating
    FROM class c
    JOIN course co ON c.course_id = co.id
    JOIN review r ON c.id = r.class_id
    GROUP BY c.id, co.name
    ORDER BY avg_rating DESC
    LIMIT 5;
""")
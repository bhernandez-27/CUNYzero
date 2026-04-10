docker exec -it my-postgres psql -U teamI -d mydb -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec -i my-postgres psql -U teamI -d mydb < schema.sql
docker exec -i my-postgres psql -U teamI -d mydb < seed.sql
echo "Database reset complete!"
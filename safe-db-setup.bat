@echo off
echo Creating tables...
mysql -u root -ppassword attendance_system < attendance-system\database\schema.sql
echo Adding users...
mysql -u root -ppassword attendance_system < attendance-system\database\seed.sql
echo Verify...
mysql -u root -ppassword attendance_system -e "SELECT email, role FROM users WHERE role='admin'"
echo.
echo === LOGIN: admin@example.com / password ===
echo === Backend: cd attendance-system\backend ^& npm start ===
pause

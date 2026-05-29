@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1
cmake -S . -B build -G "NMake Makefiles" && cmake --build build
copy /Y "C:\Program Files\MySQL\MySQL Server 8.0\lib\libmysql.dll" build\ >nul
echo.
echo Build complete. Run: build\server.exe

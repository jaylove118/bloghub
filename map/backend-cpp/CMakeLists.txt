cmake_minimum_required(VERSION 3.16)
project(bloghub-server LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS ON)
set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} /MANIFEST:NO")
add_compile_options(/utf-8 /W3 /wd4819)

set(MYSQL_DIR "C:/Program Files/MySQL/MySQL Server 8.0")
include_directories(
    src/libs
    "${MYSQL_DIR}/include"
)

link_directories("${MYSQL_DIR}/lib")

add_executable(server src/main.cpp)

target_link_libraries(server
    "${MYSQL_DIR}/lib/libmysql.lib"
    ws2_32
    crypt32
    bcrypt
)

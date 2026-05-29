#include <iostream>
#include <string>
#include <vector>
#include <unordered_map>
#include <mutex>
#include <random>
#include <sstream>
#include <iomanip>
#include <chrono>
#include <algorithm>
#include <cstdlib>
#include <ctime>

#include "httplib.h"
#include "json.hpp"
#include <mysql.h>
#include <Windows.h>
#include <bcrypt.h>

#pragma comment(lib, "bcrypt.lib")

using json = nlohmann::json;

// --- Config (from environment, with defaults) ---
static std::string getEnv(const char* name, const char* def) {
    const char* val = getenv(name);
    return val ? val : def;
}

std::string DB_HOST;
int         DB_PORT;
std::string DB_USER;
std::string DB_PASS;
std::string DB_NAME;
int         SERVER_PORT;
std::string JWT_SECRET;

void loadConfig() {
    DB_HOST     = getEnv("DB_HOST", "localhost");
    DB_PORT     = std::stoi(getEnv("DB_PORT", "3306"));
    DB_USER     = getEnv("DB_USER", "root");
    DB_PASS     = getEnv("DB_PASSWORD", "");
    DB_NAME     = getEnv("DB_NAME", "bloghub");
    SERVER_PORT = std::stoi(getEnv("PORT", "3002"));
    JWT_SECRET  = getEnv("JWT_SECRET", "bloghub_jwt_secret_dev");
}

// --- Logger ---
#define LOG(msg) std::cout << "[" << __TIME__ << "] " << msg << std::endl

// --- Per-thread DB connection (replaces global lock) ---
static thread_local MYSQL* tls_db = nullptr;

MYSQL* connectDB() {
    MYSQL* conn = mysql_init(nullptr);
    if (!conn) { LOG("mysql_init failed"); return nullptr; }
    if (!mysql_real_connect(conn, DB_HOST.c_str(), DB_USER.c_str(), DB_PASS.c_str(),
                            DB_NAME.c_str(), DB_PORT, nullptr, 0)) {
        LOG(std::string("DB connect: ") + mysql_error(conn));
        mysql_close(conn);
        return nullptr;
    }
    mysql_set_character_set(conn, "utf8mb4");
    return conn;
}

MYSQL* dbEnsureConn() {
    if (tls_db && mysql_ping(tls_db) == 0) return tls_db;
    if (tls_db) { mysql_close(tls_db); tls_db = nullptr; }
    tls_db = connectDB();
    if (tls_db) LOG("DB reconnected on thread");
    return tls_db;
}

MYSQL_RES* dbQuery(MYSQL* conn, const std::string& sql) {
    if (mysql_query(conn, sql.c_str())) {
        LOG(std::string("SQL: ") + mysql_error(conn));
        return nullptr;
    }
    return mysql_store_result(conn);
}

std::string escapeStr(MYSQL* conn, const std::string& s) {
    std::vector<char> buf(s.size() * 2 + 1);
    mysql_real_escape_string(conn, buf.data(), s.c_str(), static_cast<unsigned long>(s.size()));
    return std::string(buf.data());
}

int getInsertId(MYSQL* conn) {
    return static_cast<int>(mysql_insert_id(conn));
}

int safeInt(const std::string& s, int def = 0) {
    try { return std::stoi(s); } catch (...) { return def; }
}

json parseJson(const std::string& s) {
    if (s.empty()) return json::object();
    try { return json::parse(s); } catch (...) { return json::object(); }
}

// --- Base64URL (for JWT) ---
static const char base64url_chars[] =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

std::string base64url_encode(const std::string& data) {
    std::string out;
    int val = 0, valb = -6;
    for (unsigned char c : data) {
        val = (val << 8) + c;
        valb += 8;
        while (valb >= 0) {
            out.push_back(base64url_chars[(val >> valb) & 0x3F]);
            valb -= 6;
        }
    }
    if (valb > -6) out.push_back(base64url_chars[((val << 8) >> (valb + 8)) & 0x3F]);
    // JWT spec: base64url MUST omit padding (RFC 7515)
    return out;
}

std::string base64url_decode(const std::string& data) {
    std::string out;
    std::vector<int> T(256, -1);
    for (int i = 0; i < 64; i++) T[(unsigned char)base64url_chars[i]] = i;
    T['='] = 0; // treat padding as 0
    int val = 0, valb = -8;
    for (unsigned char c : data) {
        if (T[c] == -1) break;
        val = (val << 6) + T[c];
        valb += 6;
        if (valb >= 0) {
            out.push_back(char((val >> valb) & 0xFF));
            valb -= 8;
        }
    }
    return out;
}

// --- HMAC-SHA256 using Windows CNG ---
std::string hmac_sha256(const std::string& key, const std::string& data) {
    BCRYPT_ALG_HANDLE hAlg = nullptr;
    BCRYPT_HASH_HANDLE hHash = nullptr;
    std::string result;

    if (BCryptOpenAlgorithmProvider(&hAlg, BCRYPT_SHA256_ALGORITHM, nullptr,
                                     BCRYPT_ALG_HANDLE_HMAC_FLAG) != 0)
        return "";

    if (BCryptCreateHash(hAlg, &hHash, nullptr, 0,
                          (PUCHAR)key.c_str(), (ULONG)key.size(), 0) != 0) {
        BCryptCloseAlgorithmProvider(hAlg, 0);
        return "";
    }

    if (BCryptHashData(hHash, (PUCHAR)data.c_str(), (ULONG)data.size(), 0) == 0) {
        DWORD hashLen = 0, cbResult = 0;
        BCryptGetProperty(hAlg, BCRYPT_HASH_LENGTH, (PUCHAR)&hashLen, sizeof(DWORD), &cbResult, 0);
        std::vector<BYTE> hash(hashLen);
        if (BCryptFinishHash(hHash, hash.data(), hashLen, 0) == 0) {
            result.assign((char*)hash.data(), hashLen);
        }
    }

    BCryptDestroyHash(hHash);
    BCryptCloseAlgorithmProvider(hAlg, 0);
    return result;
}

// --- JWT ---
std::string createJWT(int userId) {
    json header = {{"alg", "HS256"}, {"typ", "JWT"}};
    auto now = std::chrono::system_clock::now();
    auto exp = now + std::chrono::hours(24 * 7);
    json payload;
    payload["userId"] = userId;
    payload["iat"] = std::chrono::duration_cast<std::chrono::seconds>(
                         now.time_since_epoch()).count();
    payload["exp"] = std::chrono::duration_cast<std::chrono::seconds>(
                         exp.time_since_epoch()).count();

    std::string h = base64url_encode(header.dump());
    std::string p = base64url_encode(payload.dump());
    std::string sig = base64url_encode(hmac_sha256(JWT_SECRET, h + "." + p));
    return h + "." + p + "." + sig;
}

int verifyJWT(const std::string& token) {
    size_t d1 = token.find('.');
    size_t d2 = token.find('.', d1 + 1);
    if (d1 == std::string::npos || d2 == std::string::npos) return -1;

    std::string h = token.substr(0, d1);
    std::string p = token.substr(d1 + 1, d2 - d1 - 1);
    std::string sig = token.substr(d2 + 1);

    std::string expected_sig = base64url_encode(hmac_sha256(JWT_SECRET, h + "." + p));
    if (expected_sig != sig) return -1;

    json payload = parseJson(base64url_decode(p));
    if (!payload.contains("userId") || !payload.contains("exp")) return -1;

    auto exp_time = std::chrono::system_clock::time_point(
        std::chrono::seconds(payload["exp"].get<int64_t>()));
    if (std::chrono::system_clock::now() > exp_time) return -1;

    return payload["userId"].get<int>();
}

// --- JSON row mapping ---
json rowToJsonUser(MYSQL_ROW row) {
    json u;
    u["id"] = row[0] ? safeInt(row[0]) : 0;
    u["username"] = row[1] ? row[1] : "";
    u["email"] = row[2] ? row[2] : "";
    u["avatar"] = row[3] ? row[3] : "";
    u["bio"] = row[4] ? row[4] : "";
    u["github"] = row[5] ? row[5] : "";
    u["created_at"] = row[6] ? row[6] : "";
    return u;
}

json rowToJsonPost(MYSQL_RES* res, MYSQL_ROW row) {
    json p;
    int num = mysql_num_fields(res);
    p["id"] = row[0] ? safeInt(row[0]) : 0;
    p["title"] = row[1] ? row[1] : "";
    p["content"] = row[2] ? row[2] : "";
    p["excerpt"] = row[3] ? row[3] : "";
    p["category"] = row[4] ? row[4] : "";
    p["cover_image"] = row[5] ? row[5] : "";

    json ts = parseJson(row[6] ? row[6] : "[]");
    p["tags"] = (ts.is_array()) ? ts : json::array();
    p["author_id"] = row[7] ? safeInt(row[7]) : 0;
    p["view_count"] = row[8] ? safeInt(row[8]) : 0;

    json ls = parseJson(row[9] ? row[9] : "[]");
    p["likes"] = (ls.is_array()) ? ls : json::array();
    json fs = parseJson(row[10] ? row[10] : "[]");
    p["favorites"] = (fs.is_array()) ? fs : json::array();
    p["is_pinned"] = row[11] ? (safeInt(row[11]) != 0) : false;

    p["created_at"] = row[12] ? row[12] : "";
    p["updated_at"] = row[13] ? row[13] : "";
    if (num > 14) {
        p["author_name"] = row[14] ? row[14] : "";
        p["author_avatar"] = row[15] ? row[15] : "";
    }
    return p;
}

json rowToJsonComment(MYSQL_RES* res, MYSQL_ROW row) {
    json c;
    c["id"] = row[0] ? safeInt(row[0]) : 0;
    c["content"] = row[1] ? row[1] : "";
    c["post_id"] = row[2] ? safeInt(row[2]) : 0;
    c["user_id"] = row[3] ? safeInt(row[3]) : 0;
    c["parent_id"] = row[4] ? (row[4] ? safeInt(row[4]) : 0) : 0;

    json ls = parseJson(row[5] ? row[5] : "[]");
    c["likes"] = (ls.is_array()) ? ls : json::array();
    c["created_at"] = row[6] ? row[6] : "";

    int num = mysql_num_fields(res);
    c["username"] = (num > 7 && row[7]) ? row[7] : "";
    c["avatar"] = (num > 8 && row[8]) ? row[8] : "";
    return c;
}

std::string jsonError(const std::string& msg) {
    json j;
    j["message"] = msg;
    return j.dump();
}

// --- Helpers ---
int getUserId(const httplib::Request& req) {
    auto it = req.headers.find("Authorization");
    if (it == req.headers.end()) return -1;
    const std::string& auth = it->second;
    if (auth.size() < 8 || auth.substr(0, 7) != "Bearer ") return -1;
    return verifyJWT(auth.substr(7));
}

// Check if a hash looks like bcrypt ($2a$, $2b$, $2y$)
bool isBcryptHash(const std::string& hash) {
    return hash.size() >= 4 &&
           hash[0] == '$' && hash[1] == '2' &&
           (hash[2] == 'a' || hash[2] == 'b' || hash[2] == 'y') &&
           hash[3] == '$';
}

// --- Main ---
int main() {
    loadConfig();

    MYSQL* init_db = connectDB();
    if (!init_db) {
        std::cerr << "FATAL: Cannot connect to MySQL\n";
        return 1;
    }
    LOG(std::string("Connected to MySQL: ") + DB_NAME);
    mysql_close(init_db);

    // Initialize TLS DB for main thread
    tls_db = connectDB();

    httplib::Server svr;

    // Global error handler
    svr.set_exception_handler([](const httplib::Request&, httplib::Response& res, std::exception_ptr ep) {
        try { if (ep) std::rethrow_exception(ep); }
        catch (const std::exception& e) { LOG(std::string("Unhandled: ") + e.what()); }
        catch (...) {}
        res.status = 500;
        res.set_content(jsonError("服务器内部错误"), "application/json");
    });

    // CORS
    svr.set_pre_routing_handler([](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.set_header("X-Backend", "C++/httplib");
        if (req.method == "OPTIONS") {
            res.status = 204;
            return httplib::Server::HandlerResponse::Unhandled;
        }
        return httplib::Server::HandlerResponse::Unhandled;
    });

    // ===== AUTH =====
    svr.Post("/api/auth/register", [](const httplib::Request& req, httplib::Response& res) {
        try {
            MYSQL* db = dbEnsureConn();
            if (!db) { res.status = 500; res.set_content(jsonError("数据库连接失败"), "application/json"); return; }
            json body = parseJson(req.body);
            std::string u = escapeStr(db, body.value("username", ""));
            std::string e = escapeStr(db, body.value("email", ""));
            std::string p = escapeStr(db, body.value("password", ""));
            std::string a = escapeStr(db, body.value("avatar", ""));

            std::string cs = "SELECT id FROM users WHERE email='" + e + "'";
            MYSQL_RES* cr = dbQuery(db, cs);
            if (cr && mysql_num_rows(cr) > 0) {
                mysql_free_result(cr);
                res.status = 400; res.set_content(jsonError("该邮箱已被注册"), "application/json"); return;
            }
            if (cr) mysql_free_result(cr);

            // Use SHA256 with per-user random salt stored in password field
            // Format: $sha256$<salt>$<hash>
            unsigned char salt_bytes[16];
            BCryptGenRandom(nullptr, salt_bytes, sizeof(salt_bytes), BCRYPT_USE_SYSTEM_PREFERRED_RNG);
            std::stringstream salt_hex;
            for (int i = 0; i < 16; i++)
                salt_hex << std::hex << std::setw(2) << std::setfill('0') << (int)salt_bytes[i];
            std::string salt = salt_hex.str();
            std::string hash_input = salt + p;

            std::string sha_sql = "SELECT SHA2(CONCAT('" + escapeStr(db, salt) + "','" + p + "'),256) AS h";
            MYSQL_RES* hr = dbQuery(db, sha_sql);
            std::string pw_hash;
            if (hr && mysql_num_rows(hr) > 0) {
                MYSQL_ROW hrow = mysql_fetch_row(hr);
                pw_hash = "$sha256$" + salt + "$" + (hrow[0] ? hrow[0] : "");
            }
            if (hr) mysql_free_result(hr);

            std::string sql = "INSERT INTO users(username,email,password,avatar) VALUES('"
                + u + "','" + e + "','" + escapeStr(db, pw_hash) + "','" + a + "')";
            MYSQL_RES* r = dbQuery(db, sql);
            if (r) mysql_free_result(r);
            int uid = getInsertId(db);

            std::string tk = createJWT(uid);

            MYSQL_RES* ur = dbQuery(db, "SELECT id,username,email,avatar,bio,github,created_at FROM users WHERE id=" + std::to_string(uid));
            json resp;
            resp["user"] = (ur && mysql_num_rows(ur) > 0) ? rowToJsonUser(mysql_fetch_row(ur)) : json::object();
            resp["token"] = tk;
            if (ur) mysql_free_result(ur);
            res.set_content(resp.dump(), "application/json");
        } catch (const std::exception& e) {
            res.status = 500; res.set_content(jsonError("服务器错误"), "application/json");
        }
    });

    svr.Post("/api/auth/login", [](const httplib::Request& req, httplib::Response& res) {
        try {
            MYSQL* db = dbEnsureConn();
            if (!db) { res.status = 500; res.set_content(jsonError("数据库连接失败"), "application/json"); return; }
            json body = parseJson(req.body);
            std::string e = escapeStr(db, body.value("email", ""));
            std::string p = escapeStr(db, body.value("password", ""));

            std::string sql = "SELECT id,username,email,avatar,bio,github,created_at,password FROM users WHERE email='" + e + "'";
            MYSQL_RES* ur = dbQuery(db, sql);
            if (!ur || mysql_num_rows(ur) == 0) {
                if (ur) mysql_free_result(ur);
                res.status = 401; res.set_content(jsonError("邮箱或密码错误"), "application/json"); return;
            }
            MYSQL_ROW row = mysql_fetch_row(ur);
            std::string storedHash = row[7] ? row[7] : "";
            int uid = safeInt(row[0]);
            bool pwdOk = false;

            if (isBcryptHash(storedHash)) {
                // User was registered via Express (bcrypt). C++ cannot verify bcrypt
                // natively. Instruct the user to use the web frontend.
                mysql_free_result(ur);
                res.status = 401;
                res.set_content(jsonError("该账户由Web端注册，请通过网页登录"), "application/json");
                return;
            }

            // Check $sha256$<salt>$<hash> format (C++ registered users)
            if (storedHash.substr(0, 8) == "$sha256$") {
                size_t d2 = storedHash.find('$', 8);
                if (d2 != std::string::npos) {
                    std::string salt = storedHash.substr(8, d2 - 8);
                    std::string expectedHash = storedHash.substr(d2 + 1);
                    std::string sha_sql = "SELECT SHA2(CONCAT('" + escapeStr(db, salt) + "','" + p + "'),256) AS h";
                    MYSQL_RES* hr = dbQuery(db, sha_sql);
                    if (hr && mysql_num_rows(hr) > 0) {
                        MYSQL_ROW hrow = mysql_fetch_row(hr);
                        std::string computed = hrow[0] ? hrow[0] : "";
                        if (computed == expectedHash) pwdOk = true;
                    }
                    if (hr) mysql_free_result(hr);
                }
            } else {
                // Legacy SHA256 with global salt (old C++ format)
                std::string shaSql = "SELECT SHA2(CONCAT('" + p + "','bloghub_salt'),256) AS h";
                MYSQL_RES* hr = dbQuery(db, shaSql);
                if (hr && mysql_num_rows(hr) > 0) {
                    MYSQL_ROW hrow = mysql_fetch_row(hr);
                    std::string computed = hrow[0] ? hrow[0] : "";
                    if (computed == storedHash) pwdOk = true;
                }
                if (hr) mysql_free_result(hr);
            }

            if (!pwdOk) {
                mysql_free_result(ur);
                res.status = 401; res.set_content(jsonError("邮箱或密码错误"), "application/json"); return;
            }

            std::string tk = createJWT(uid);

            json resp;
            resp["user"] = rowToJsonUser(row);
            resp["token"] = tk;
            mysql_free_result(ur);
            res.set_content(resp.dump(), "application/json");
        } catch (const std::exception& e) {
            res.status = 500; res.set_content(jsonError("服务器错误"), "application/json");
        }
    });

    svr.Get("/api/auth/me", [](const httplib::Request& req, httplib::Response& res) {
        try {
            int uid = getUserId(req);
            if (uid < 0) { res.status = 401; res.set_content(jsonError("请先登录"), "application/json"); return; }
            MYSQL* db = dbEnsureConn();
            if (!db) { res.status = 500; res.set_content(jsonError("数据库连接失败"), "application/json"); return; }
            MYSQL_RES* ur = dbQuery(db, "SELECT id,username,email,avatar,bio,github,created_at FROM users WHERE id=" + std::to_string(uid));
            json resp;
            resp["user"] = (ur && mysql_num_rows(ur) > 0) ? rowToJsonUser(mysql_fetch_row(ur)) : json::object();
            if (ur) mysql_free_result(ur);
            res.set_content(resp.dump(), "application/json");
        } catch (...) { res.status = 500; res.set_content(jsonError("服务器错误"), "application/json"); }
    });

    svr.Put("/api/auth/profile", [](const httplib::Request& req, httplib::Response& res) {
        try {
            int uid = getUserId(req);
            if (uid < 0) { res.status = 401; res.set_content(jsonError("请先登录"), "application/json"); return; }
            MYSQL* db = dbEnsureConn();
            if (!db) { res.status = 500; res.set_content(jsonError("数据库连接失败"), "application/json"); return; }
            json body = parseJson(req.body);
            std::string un = escapeStr(db, body.value("username", ""));
            std::string bi = escapeStr(db, body.value("bio", ""));
            std::string av = escapeStr(db, body.value("avatar", ""));
            std::string gh = escapeStr(db, body.value("github", ""));
            MYSQL_RES* r2 = dbQuery(db,
                "UPDATE users SET username='" + un + "',bio='" + bi + "',avatar='" + av + "',github='" + gh + "' WHERE id=" + std::to_string(uid));
            if (r2) mysql_free_result(r2);
            MYSQL_RES* ur = dbQuery(db, "SELECT id,username,email,avatar,bio,github,created_at FROM users WHERE id=" + std::to_string(uid));
            json resp;
            resp["user"] = (ur && mysql_num_rows(ur) > 0) ? rowToJsonUser(mysql_fetch_row(ur)) : json::object();
            if (ur) mysql_free_result(ur);
            res.set_content(resp.dump(), "application/json");
        } catch (...) { res.status = 500; res.set_content(jsonError("服务器错误"), "application/json"); }
    });

    svr.Put("/api/auth/password", [](const httplib::Request& req, httplib::Response& res) {
        try {
            int uid = getUserId(req);
            if (uid < 0) { res.status = 401; res.set_content(jsonError("请先登录"), "application/json"); return; }
            MYSQL* db = dbEnsureConn();
            if (!db) { res.status = 500; res.set_content(jsonError("数据库连接失败"), "application/json"); return; }

            json body = parseJson(req.body);
            std::string oldPwd = body.value("oldPassword", "");
            std::string newPwd = body.value("newPassword", "");

            if (oldPwd.empty() || newPwd.empty()) {
                res.status = 400; res.set_content(jsonError("请填写旧密码和新密码"), "application/json"); return;
            }
            if (newPwd.size() < 6) {
                res.status = 400; res.set_content(jsonError("新密码至少需要6个字符"), "application/json"); return;
            }

            MYSQL_RES* ur = dbQuery(db, "SELECT password FROM users WHERE id=" + std::to_string(uid));
            if (!ur || mysql_num_rows(ur) == 0) {
                if (ur) mysql_free_result(ur);
                res.status = 404; res.set_content(jsonError("用户不存在"), "application/json"); return;
            }
            std::string storedHash = mysql_fetch_row(ur)[0] ? mysql_fetch_row(ur)[0] : "";
            mysql_free_result(ur);

            bool oldPwdOk = false;
            if (isBcryptHash(storedHash)) {
                res.status = 400;
                res.set_content(jsonError("该账户由Web端注册，请通过网页修改密码"), "application/json");
                return;
            }
            if (storedHash.substr(0, 8) == "$sha256$") {
                size_t d2 = storedHash.find('$', 8);
                if (d2 != std::string::npos) {
                    std::string salt = storedHash.substr(8, d2 - 8);
                    std::string expectedHash = storedHash.substr(d2 + 1);
                    std::string sha_sql = "SELECT SHA2(CONCAT('" + escapeStr(db, salt) + "','" + escapeStr(db, oldPwd) + "'),256) AS h";
                    MYSQL_RES* hr = dbQuery(db, sha_sql);
                    if (hr && mysql_num_rows(hr) > 0) {
                        MYSQL_ROW hrow = mysql_fetch_row(hr);
                        if (hrow[0] && std::string(hrow[0]) == expectedHash) oldPwdOk = true;
                    }
                    if (hr) mysql_free_result(hr);
                }
            } else {
                std::string shaSql = "SELECT SHA2(CONCAT('" + escapeStr(db, oldPwd) + "','bloghub_salt'),256) AS h";
                MYSQL_RES* hr = dbQuery(db, shaSql);
                if (hr && mysql_num_rows(hr) > 0) {
                    MYSQL_ROW hrow = mysql_fetch_row(hr);
                    if (hrow[0] && std::string(hrow[0]) == storedHash) oldPwdOk = true;
                }
                if (hr) mysql_free_result(hr);
            }

            if (!oldPwdOk) {
                res.status = 400; res.set_content(jsonError("旧密码不正确"), "application/json"); return;
            }

            // Hash new password with per-user salt
            unsigned char salt_bytes[16];
            BCryptGenRandom(nullptr, salt_bytes, sizeof(salt_bytes), BCRYPT_USE_SYSTEM_PREFERRED_RNG);
            std::stringstream salt_hex;
            for (int i = 0; i < 16; i++)
                salt_hex << std::hex << std::setw(2) << std::setfill('0') << (int)salt_bytes[i];
            std::string salt = salt_hex.str();
            std::string sha_sql = "SELECT SHA2(CONCAT('" + escapeStr(db, salt) + "','" + escapeStr(db, newPwd) + "'),256) AS h";
            MYSQL_RES* hr = dbQuery(db, sha_sql);
            std::string newHash;
            if (hr && mysql_num_rows(hr) > 0) {
                MYSQL_ROW hrow = mysql_fetch_row(hr);
                newHash = "$sha256$" + salt + "$" + (hrow[0] ? hrow[0] : "");
            }
            if (hr) mysql_free_result(hr);

            MYSQL_RES* r = dbQuery(db, "UPDATE users SET password='" + escapeStr(db, newHash) + "' WHERE id=" + std::to_string(uid));
            if (r) mysql_free_result(r);
            res.set_content("{\"success\":true}", "application/json");
        } catch (...) { res.status = 500; res.set_content(jsonError("服务器错误"), "application/json"); }
    });

    // ===== POSTS =====
    svr.Get("/api/posts", [](const httplib::Request& req, httplib::Response& res) {
        try {
            MYSQL* db = dbEnsureConn();
            if (!db) { res.status = 500; res.set_content(jsonError("数据库连接失败"), "application/json"); return; }
            std::string cat = req.has_param("category") ? escapeStr(db, req.get_param_value("category")) : "";
            std::string tagsParam = req.has_param("tags") ? req.get_param_value("tags") : "";
            if (tagsParam.empty() && req.has_param("tag")) tagsParam = req.get_param_value("tag");
            std::string srch = req.has_param("search") ? escapeStr(db, req.get_param_value("search")) : "";
            std::string aid = req.has_param("authorId") ? req.get_param_value("authorId") : "";
            int page = req.has_param("page") ? safeInt(req.get_param_value("page"), 1) : 1;
            int limit = req.has_param("limit") ? safeInt(req.get_param_value("limit"), 12) : 12;
            if (page < 1) page = 1;
            if (limit < 1) limit = 12; if (limit > 100) limit = 100;

            std::string where = " WHERE 1=1";
            if (!cat.empty() && cat != "all") where += " AND p.category='" + cat + "'";
            if (!aid.empty()) where += " AND p.author_id=" + aid;
            if (!srch.empty()) where += " AND (p.title LIKE '%" + srch + "%' OR p.content LIKE '%" + srch + "%')";
            if (!tagsParam.empty()) {
                std::stringstream ss(tagsParam);
                std::string item;
                while (std::getline(ss, item, ',')) {
                    item.erase(0, item.find_first_not_of(" \t\n\r"));
                    item.erase(item.find_last_not_of(" \t\n\r") + 1);
                    if (!item.empty()) {
                        where += " AND JSON_CONTAINS(p.tags, '" + escapeStr(db, "\"" + item + "\"") + "')";
                    }
                }
            }

            std::string baseFrom = " FROM posts p JOIN users u ON p.author_id=u.id" + where;

            MYSQL_RES* cr = dbQuery(db, "SELECT COUNT(*)" + baseFrom);
            int total = 0;
            if (cr && mysql_num_rows(cr) > 0) total = safeInt(mysql_fetch_row(cr)[0]);
            if (cr) mysql_free_result(cr);

            std::string sql = "SELECT p.*,u.username AS author_name,u.avatar AS author_avatar"
                + baseFrom + " ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT "
                + std::to_string(limit) + " OFFSET " + std::to_string((page - 1) * limit);

            MYSQL_RES* pr = dbQuery(db, sql);
            json resp;
            json arr = json::array();
            if (pr) {
                while (MYSQL_ROW row = mysql_fetch_row(pr)) {
                    arr.push_back(rowToJsonPost(pr, row));
                }
                mysql_free_result(pr);
            }
            resp["posts"] = arr;
            resp["pagination"] = {{"page", page}, {"limit", limit}, {"total", total}};
            res.set_content(resp.dump(), "application/json");
        } catch (...) { res.status = 500; res.set_content(jsonError("服务器错误"), "application/json"); }
    });

    svr.Get(R"(/api/posts/(\d+))", [](const httplib::Request& req, httplib::Response& res) {
        try {
            MYSQL* db = dbEnsureConn();
            if (!db) { res.status = 500; res.set_content(jsonError("数据库连接失败"), "application/json"); return; }
            std::string id = req.matches[1];
            MYSQL_RES* vr = dbQuery(db, "UPDATE posts SET view_count=view_count+1 WHERE id=" + id);
            if (vr) mysql_free_result(vr);
            MYSQL_RES* pr = dbQuery(db,
                "SELECT p.*,u.username AS author_name,u.avatar AS author_avatar FROM posts p JOIN users u ON p.author_id=u.id WHERE p.id=" + id);
            if (!pr || mysql_num_rows(pr) == 0) {
                if (pr) mysql_free_result(pr);
                res.status = 404; res.set_content(jsonError("文章不存在"), "application/json"); return;
            }
            json resp;
            resp["post"] = rowToJsonPost(pr, mysql_fetch_row(pr));
            mysql_free_result(pr);
            res.set_content(resp.dump(), "application/json");
        } catch (...) { res.status = 500; res.set_content(jsonError("服务器错误"), "application/json"); }
    });

    svr.Post("/api/posts", [](const httplib::Request& req, httplib::Response& res) {
        try {
            int uid = getUserId(req);
            if (uid < 0) { res.status = 401; res.set_content(jsonError("请先登录"), "application/json"); return; }
            MYSQL* db = dbEnsureConn();
            if (!db) { res.status = 500; res.set_content(jsonError("数据库连接失败"), "application/json"); return; }
            json body = parseJson(req.body);
            std::string t = escapeStr(db, body.value("title", ""));
            std::string c = escapeStr(db, body.value("content", ""));
            std::string ex = escapeStr(db, body.value("excerpt", ""));
            std::string ca = escapeStr(db, body.value("category", "tech"));
            std::string ci = escapeStr(db, body.value("coverImage", ""));
            std::string tg = escapeStr(db, (body.contains("tags") ? body["tags"].dump() : "[]"));

            MYSQL_RES* r = dbQuery(db, "INSERT INTO posts(title,content,excerpt,category,cover_image,tags,author_id) VALUES('"
                + t + "','" + c + "','" + ex + "','" + ca + "','" + ci + "','" + tg + "'," + std::to_string(uid) + ")");
            if (r) mysql_free_result(r);
            int pid = getInsertId(db);

            MYSQL_RES* pr = dbQuery(db,
                "SELECT p.*,u.username AS author_name,u.avatar AS author_avatar FROM posts p JOIN users u ON p.author_id=u.id WHERE p.id=" + std::to_string(pid));
            json resp;
            resp["post"] = (pr && mysql_num_rows(pr) > 0) ? rowToJsonPost(pr, mysql_fetch_row(pr)) : json::object();
            if (pr) mysql_free_result(pr);
            res.status = 201; res.set_content(resp.dump(), "application/json");
        } catch (...) { res.status = 500; res.set_content(jsonError("服务器错误"), "application/json"); }
    });

    svr.Put(R"(/api/posts/(\d+))", [](const httplib::Request& req, httplib::Response& res) {
        try {
            int uid = getUserId(req);
            if (uid < 0) { res.status = 401; res.set_content(jsonError("请先登录"), "application/json"); return; }
            MYSQL* db = dbEnsureConn();
            if (!db) { res.status = 500; res.set_content(jsonError("数据库连接失败"), "application/json"); return; }
            std::string id = req.matches[1];
            json body = parseJson(req.body);

            MYSQL_RES* cr = dbQuery(db, "SELECT author_id FROM posts WHERE id=" + id);
            if (!cr || mysql_num_rows(cr) == 0) {
                if (cr) mysql_free_result(cr);
                res.status = 404; res.set_content(jsonError("文章不存在"), "application/json"); return;
            }
            if (safeInt(mysql_fetch_row(cr)[0]) != uid) {
                mysql_free_result(cr);
                res.status = 403; res.set_content(jsonError("无权修改他人文章"), "application/json"); return;
            }
            mysql_free_result(cr);

            std::string t = escapeStr(db, body.value("title", ""));
            std::string c = escapeStr(db, body.value("content", ""));
            std::string ex = escapeStr(db, body.value("excerpt", ""));
            std::string ca = escapeStr(db, body.value("category", "tech"));
            std::string ci = escapeStr(db, body.value("coverImage", ""));
            std::string tg = escapeStr(db, (body.contains("tags") ? body["tags"].dump() : "[]"));
            MYSQL_RES* r = dbQuery(db, "UPDATE posts SET title='" + t + "',content='" + c
                + "',excerpt='" + ex + "',category='" + ca + "',cover_image='" + ci + "',tags='" + tg + "' WHERE id=" + id);
            if (r) mysql_free_result(r);

            MYSQL_RES* pr = dbQuery(db,
                "SELECT p.*,u.username AS author_name,u.avatar AS author_avatar FROM posts p JOIN users u ON p.author_id=u.id WHERE p.id=" + id);
            json resp;
            resp["post"] = (pr && mysql_num_rows(pr) > 0) ? rowToJsonPost(pr, mysql_fetch_row(pr)) : json::object();
            if (pr) mysql_free_result(pr);
            res.set_content(resp.dump(), "application/json");
        } catch (...) { res.status = 500; res.set_content(jsonError("服务器错误"), "application/json"); }
    });

    svr.Delete(R"(/api/posts/(\d+))", [](const httplib::Request& req, httplib::Response& res) {
        try {
            int uid = getUserId(req);
            if (uid < 0) { res.status = 401; res.set_content(jsonError("请先登录"), "application/json"); return; }
            MYSQL* db = dbEnsureConn();
            if (!db) { res.status = 500; res.set_content(jsonError("数据库连接失败"), "application/json"); return; }
            std::string id = req.matches[1];
            MYSQL_RES* cr = dbQuery(db, "SELECT author_id FROM posts WHERE id=" + id);
            if (!cr || mysql_num_rows(cr) == 0) {
                if (cr) mysql_free_result(cr);
                res.status = 404; res.set_content(jsonError("文章不存在"), "application/json"); return;
            }
            if (safeInt(mysql_fetch_row(cr)[0]) != uid) {
                mysql_free_result(cr);
                res.status = 403; res.set_content(jsonError("无权删除他人文章"), "application/json"); return;
            }
            mysql_free_result(cr);
            MYSQL_RES* r = dbQuery(db, "DELETE FROM posts WHERE id=" + id);
            if (r) mysql_free_result(r);
            res.set_content("{\"success\":true}", "application/json");
        } catch (...) { res.status = 500; res.set_content(jsonError("服务器错误"), "application/json"); }
    });

    // Like with transaction (same as Express)
    svr.Post(R"(/api/posts/(\d+)/like)", [](const httplib::Request& req, httplib::Response& res) {
        try {
            int uid = getUserId(req);
            if (uid < 0) { res.status = 401; res.set_content(jsonError("请先登录"), "application/json"); return; }
            MYSQL* db = dbEnsureConn();
            if (!db) { res.status = 500; res.set_content(jsonError("数据库连接失败"), "application/json"); return; }
            std::string id = req.matches[1];

            mysql_query(db, "START TRANSACTION");
            MYSQL_RES* r = dbQuery(db, "SELECT likes FROM posts WHERE id=" + id + " FOR UPDATE");
            if (!r || mysql_num_rows(r) == 0) {
                if (r) mysql_free_result(r);
                mysql_query(db, "ROLLBACK");
                res.status = 404; res.set_content(jsonError("文章不存在"), "application/json"); return;
            }
            json likes = parseJson(mysql_fetch_row(r)[0] ? mysql_fetch_row(r)[0] : "[]");
            if (!likes.is_array()) likes = json::array();
            mysql_free_result(r);

            auto it = std::find(likes.begin(), likes.end(), uid);
            if (it != likes.end()) likes.erase(it); else likes.push_back(uid);

            MYSQL_RES* ur = dbQuery(db, "UPDATE posts SET likes='" + escapeStr(db, likes.dump()) + "' WHERE id=" + id);
            if (ur) mysql_free_result(ur);
            mysql_query(db, "COMMIT");

            json resp; resp["likes"] = likes;
            res.set_content(resp.dump(), "application/json");
        } catch (...) {
            MYSQL* db = dbEnsureConn();
            if (db) mysql_query(db, "ROLLBACK");
            res.status = 500; res.set_content(jsonError("服务器错误"), "application/json");
        }
    });

    // Favorite with transaction
    svr.Post(R"(/api/posts/(\d+)/favorite)", [](const httplib::Request& req, httplib::Response& res) {
        try {
            int uid = getUserId(req);
            if (uid < 0) { res.status = 401; res.set_content(jsonError("请先登录"), "application/json"); return; }
            MYSQL* db = dbEnsureConn();
            if (!db) { res.status = 500; res.set_content(jsonError("数据库连接失败"), "application/json"); return; }
            std::string id = req.matches[1];

            mysql_query(db, "START TRANSACTION");
            MYSQL_RES* r = dbQuery(db, "SELECT favorites FROM posts WHERE id=" + id + " FOR UPDATE");
            if (!r || mysql_num_rows(r) == 0) {
                if (r) mysql_free_result(r);
                mysql_query(db, "ROLLBACK");
                res.status = 404; res.set_content(jsonError("文章不存在"), "application/json"); return;
            }
            json favs = parseJson(mysql_fetch_row(r)[0] ? mysql_fetch_row(r)[0] : "[]");
            if (!favs.is_array()) favs = json::array();
            mysql_free_result(r);

            auto it = std::find(favs.begin(), favs.end(), uid);
            if (it != favs.end()) favs.erase(it); else favs.push_back(uid);

            MYSQL_RES* ur = dbQuery(db, "UPDATE posts SET favorites='" + escapeStr(db, favs.dump()) + "' WHERE id=" + id);
            if (ur) mysql_free_result(ur);
            mysql_query(db, "COMMIT");

            json resp; resp["favorites"] = favs;
            res.set_content(resp.dump(), "application/json");
        } catch (...) {
            MYSQL* db = dbEnsureConn();
            if (db) mysql_query(db, "ROLLBACK");
            res.status = 500; res.set_content(jsonError("服务器错误"), "application/json");
        }
    });

    // Pin post
    svr.Put(R"(/api/posts/(\d+)/pin)", [](const httplib::Request& req, httplib::Response& res) {
        try {
            int uid = getUserId(req);
            if (uid < 0) { res.status = 401; res.set_content(jsonError("请先登录"), "application/json"); return; }
            MYSQL* db = dbEnsureConn();
            if (!db) { res.status = 500; res.set_content(jsonError("数据库连接失败"), "application/json"); return; }
            std::string id = req.matches[1];

            MYSQL_RES* cr = dbQuery(db, "SELECT author_id, is_pinned FROM posts WHERE id=" + id);
            if (!cr || mysql_num_rows(cr) == 0) {
                if (cr) mysql_free_result(cr);
                res.status = 404; res.set_content(jsonError("文章不存在"), "application/json"); return;
            }
            MYSQL_ROW row = mysql_fetch_row(cr);
            if (safeInt(row[0]) != uid) {
                mysql_free_result(cr);
                res.status = 403; res.set_content(jsonError("无权操作他人文章"), "application/json"); return;
            }
            int newPinned = (safeInt(row[1]) == 1) ? 0 : 1;
            mysql_free_result(cr);

            MYSQL_RES* r = dbQuery(db, "UPDATE posts SET is_pinned=" + std::to_string(newPinned) + " WHERE id=" + id);
            if (r) mysql_free_result(r);
            json resp;
            resp["isPinned"] = (newPinned == 1);
            res.set_content(resp.dump(), "application/json");
        } catch (...) { res.status = 500; res.set_content(jsonError("服务器错误"), "application/json"); }
    });

    // ===== COMMENTS =====
    svr.Get(R"(/api/comments/post/(\d+))", [](const httplib::Request& req, httplib::Response& res) {
        try {
            MYSQL* db = dbEnsureConn();
            if (!db) { res.status = 500; res.set_content(jsonError("数据库连接失败"), "application/json"); return; }
            std::string pid = req.matches[1];
            MYSQL_RES* cr = dbQuery(db,
                "SELECT c.*,u.username,u.avatar FROM comments c JOIN users u ON c.user_id=u.id WHERE c.post_id=" + pid + " ORDER BY c.created_at ASC");
            json resp;
            json arr = json::array();
            if (cr) {
                while (MYSQL_ROW row = mysql_fetch_row(cr)) arr.push_back(rowToJsonComment(cr, row));
                mysql_free_result(cr);
            }
            resp["comments"] = arr;
            res.set_content(resp.dump(), "application/json");
        } catch (...) { res.status = 500; res.set_content(jsonError("服务器错误"), "application/json"); }
    });

    svr.Post("/api/comments", [](const httplib::Request& req, httplib::Response& res) {
        try {
            int uid = getUserId(req);
            if (uid < 0) { res.status = 401; res.set_content(jsonError("请先登录"), "application/json"); return; }
            MYSQL* db = dbEnsureConn();
            if (!db) { res.status = 500; res.set_content(jsonError("数据库连接失败"), "application/json"); return; }
            json body = parseJson(req.body);
            std::string ct = escapeStr(db, body.value("content", ""));
            int postId = body.value("postId", 0);
            int parentId = body.value("parentId", 0);
            std::string parentStr = (parentId > 0) ? std::to_string(parentId) : "NULL";

            MYSQL_RES* r = dbQuery(db, "INSERT INTO comments(content,post_id,user_id,parent_id) VALUES('"
                + ct + "'," + std::to_string(postId) + "," + std::to_string(uid) + "," + parentStr + ")");
            if (r) mysql_free_result(r);
            int cid = getInsertId(db);

            MYSQL_RES* cr = dbQuery(db,
                "SELECT c.*,u.username,u.avatar FROM comments c JOIN users u ON c.user_id=u.id WHERE c.id=" + std::to_string(cid));
            json resp;
            resp["comment"] = (cr && mysql_num_rows(cr) > 0) ? rowToJsonComment(cr, mysql_fetch_row(cr)) : json::object();
            if (cr) mysql_free_result(cr);
            res.status = 201; res.set_content(resp.dump(), "application/json");
        } catch (...) { res.status = 500; res.set_content(jsonError("服务器错误"), "application/json"); }
    });

    svr.Delete(R"(/api/comments/(\d+))", [](const httplib::Request& req, httplib::Response& res) {
        try {
            int uid = getUserId(req);
            if (uid < 0) { res.status = 401; res.set_content(jsonError("请先登录"), "application/json"); return; }
            MYSQL* db = dbEnsureConn();
            if (!db) { res.status = 500; res.set_content(jsonError("数据库连接失败"), "application/json"); return; }
            std::string id = req.matches[1];
            MYSQL_RES* cr = dbQuery(db, "SELECT user_id FROM comments WHERE id=" + id);
            if (!cr || mysql_num_rows(cr) == 0) {
                if (cr) mysql_free_result(cr);
                res.status = 404; res.set_content(jsonError("评论不存在"), "application/json"); return;
            }
            if (safeInt(mysql_fetch_row(cr)[0]) != uid) {
                mysql_free_result(cr);
                res.status = 403; res.set_content(jsonError("无权删除他人评论"), "application/json"); return;
            }
            mysql_free_result(cr);
            MYSQL_RES* r = dbQuery(db, "DELETE FROM comments WHERE id=" + id + " OR parent_id=" + id);
            if (r) mysql_free_result(r);
            res.set_content("{\"success\":true}", "application/json");
        } catch (...) { res.status = 500; res.set_content(jsonError("服务器错误"), "application/json"); }
    });

    // Comment like with transaction
    svr.Post(R"(/api/comments/(\d+)/like)", [](const httplib::Request& req, httplib::Response& res) {
        try {
            int uid = getUserId(req);
            if (uid < 0) { res.status = 401; res.set_content(jsonError("请先登录"), "application/json"); return; }
            MYSQL* db = dbEnsureConn();
            if (!db) { res.status = 500; res.set_content(jsonError("数据库连接失败"), "application/json"); return; }
            std::string id = req.matches[1];

            mysql_query(db, "START TRANSACTION");
            MYSQL_RES* r = dbQuery(db, "SELECT likes FROM comments WHERE id=" + id + " FOR UPDATE");
            if (!r || mysql_num_rows(r) == 0) {
                if (r) mysql_free_result(r);
                mysql_query(db, "ROLLBACK");
                res.status = 404; res.set_content(jsonError("评论不存在"), "application/json"); return;
            }
            json likes = parseJson(mysql_fetch_row(r)[0] ? mysql_fetch_row(r)[0] : "[]");
            if (!likes.is_array()) likes = json::array();
            mysql_free_result(r);

            auto it = std::find(likes.begin(), likes.end(), uid);
            if (it != likes.end()) likes.erase(it); else likes.push_back(uid);

            MYSQL_RES* ur = dbQuery(db, "UPDATE comments SET likes='" + escapeStr(db, likes.dump()) + "' WHERE id=" + id);
            if (ur) mysql_free_result(ur);
            mysql_query(db, "COMMIT");

            json resp; resp["likes"] = likes;
            res.set_content(resp.dump(), "application/json");
        } catch (...) {
            MYSQL* db = dbEnsureConn();
            if (db) mysql_query(db, "ROLLBACK");
            res.status = 500; res.set_content(jsonError("服务器错误"), "application/json");
        }
    });

    // ===== USERS =====
    svr.Get("/api/users", [](const httplib::Request&, httplib::Response& res) {
        try {
            MYSQL* db = dbEnsureConn();
            if (!db) { res.status = 500; res.set_content(jsonError("数据库连接失败"), "application/json"); return; }
            MYSQL_RES* ur = dbQuery(db, "SELECT id,username,avatar,bio,github,created_at FROM users");
            json arr = json::array();
            if (ur) {
                while (MYSQL_ROW row = mysql_fetch_row(ur)) {
                    // Manually build user without email
                    json u;
                    u["id"] = row[0] ? safeInt(row[0]) : 0;
                    u["username"] = row[1] ? row[1] : "";
                    u["avatar"] = row[2] ? row[2] : "";
                    u["bio"] = row[3] ? row[3] : "";
                    u["github"] = row[4] ? row[4] : "";
                    u["created_at"] = row[5] ? row[5] : "";
                    arr.push_back(u);
                }
                mysql_free_result(ur);
            }
            json resp; resp["users"] = arr;
            res.set_content(resp.dump(), "application/json");
        } catch (...) { res.status = 500; res.set_content(jsonError("服务器错误"), "application/json"); }
    });

    svr.Get(R"(/api/users/(\d+))", [](const httplib::Request& req, httplib::Response& res) {
        try {
            MYSQL* db = dbEnsureConn();
            if (!db) { res.status = 500; res.set_content(jsonError("数据库连接失败"), "application/json"); return; }
            std::string id = req.matches[1];
            MYSQL_RES* ur = dbQuery(db, "SELECT id,username,avatar,bio,github,created_at FROM users WHERE id=" + id);
            if (!ur || mysql_num_rows(ur) == 0) {
                if (ur) mysql_free_result(ur);
                res.status = 404; res.set_content(jsonError("用户不存在"), "application/json"); return;
            }
            MYSQL_ROW row = mysql_fetch_row(ur);
            json u;
            u["id"] = row[0] ? safeInt(row[0]) : 0;
            u["username"] = row[1] ? row[1] : "";
            u["avatar"] = row[2] ? row[2] : "";
            u["bio"] = row[3] ? row[3] : "";
            u["github"] = row[4] ? row[4] : "";
            u["created_at"] = row[5] ? row[5] : "";
            json resp; resp["user"] = u;
            mysql_free_result(ur);
            res.set_content(resp.dump(), "application/json");
        } catch (...) { res.status = 500; res.set_content(jsonError("服务器错误"), "application/json"); }
    });

    svr.Get("/api/health", [](const httplib::Request&, httplib::Response& res) {
        json j;
        j["status"] = "ok";
        j["backend"] = "C++/httplib";
        j["timestamp"] = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count();
        res.set_content(j.dump(), "application/json");
    });

    LOG("BlogHub C++ server running on http://localhost:" + std::to_string(SERVER_PORT));

    while (true) {
        if (!svr.listen("0.0.0.0", SERVER_PORT)) {
            LOG("Server listen failed, restarting in 2s...");
            Sleep(2000);
            dbEnsureConn();
            continue;
        }
        break;
    }

    if (tls_db) mysql_close(tls_db);
    return 0;
}

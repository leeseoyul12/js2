require('dotenv').config();
const express = require('express');
const app = express();

const secretKey = process.env.SECRET_KEY; // dotenv에서 불러온 SECRET_KEY 값

// cors 문제해결
const cors = require('cors');
app.use(cors());
// json으로 된 post의 바디를 읽기 위해 필요
app.use(express.json());
const jwt = require('jsonwebtoken');
const PORT = 3000;

// 인증 미들웨어에서 사용
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send('인증 헤더 없음');
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).send('토큰 검증 실패');
    }

    // 인증 성공 시 decoded 안에 있는 사용자 정보 req에 저장
    req.user = decoded;
    next(); // 다음 미들웨어 or 라우터로
  });
}

// db 연결
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});





// 게시글 작성 API
app.post("/articles", authMiddleware, (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "제목과 내용을 입력해주세요." });
  }

  const userId = req.user.id;  // 인증된 유저의 id 가져오기

  db.run(
    `INSERT INTO articles (title, content, user_id) VALUES (?, ?, ?)`, // user_id 컬럼 추가
    [title, content, userId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        id: this.lastID,
        title,
        content,
        user_id: userId, // 반환값에 유저 id 포함
      });
    }
  );
});





// 전체 아티클 리스트 주는 API (유저 이메일 포함)
app.get('/articles', (req, res) => {
  const sql = `
    SELECT articles.id, articles.title, articles.content, articles.created_at, users.email
    FROM articles
    JOIN users ON articles.user_id = users.id
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);  // returns the list of articles with user email
  });
});

// 개별 아티클을 주는 API (유저 이메일 포함)
app.get('/articles/:id', (req, res) => {
  const id = req.params.id;
  const sql = `
    SELECT articles.id, articles.title, articles.content, articles.created_at, users.email
    FROM articles
    JOIN users ON articles.user_id = users.id
    WHERE articles.id = ?
  `;

  db.get(sql, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: "Article not found" });
    }
    res.json(row);  // returns the article with user email
  });
});





// 게시글 삭제 API
app.delete("/articles/:id", authMiddleware, (req, res) => {
  const id = req.params.id;
  const sql = 'DELETE FROM articles WHERE id = ?';
  
  db.run(sql, id, function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: `총 ${this.changes}개의 아티클이 삭제되었습니다.` });
  });
});

// 게시글 업데이트 API
app.put('/articles/:id', authMiddleware, (req, res) => {
  let id = req.params.id;
  let { title, content } = req.body;

  const sql = 'UPDATE articles SET title = ?, content = ? WHERE id = ?';
  db.run(sql, [title, content, id], function(err) {
    if (err) {
      console.error('업데이트 에러:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: '게시글이 업데이트되었습니다.', changes: this.changes });
  });
});

// 댓글 추가 API
app.post("/articles/:id/comments", (req, res) => {
  const articleId = req.params.id;
  const content = req.body.content;
  
  const createdAt = new Date().toISOString();
  const sql = `INSERT INTO comments (content, created_at, article_id) VALUES (?, ?, ?)`;
  
  db.run(sql, [content, createdAt, articleId], function(err) {
    if (err) {
      console.error("댓글 삽입 중 에러 발생:", err);
      return res.status(500).json({ error: "댓글을 등록하는데 실패했습니다." });
    }
    res.status(201).json({
      id: this.lastID,
      content: content,
      created_at: createdAt,
      article_id: articleId
    });
  });
});



// 회원가입 API
const bcrypt = require('bcrypt');
const saltRounds = 10;
app.post('/users', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send("Email and password are required.");
  }

  bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
    if (err) {
      return res.status(500).send("Error hashing password");
    }

    const query = `INSERT INTO users (email, password) VALUES (?, ?)`;

    db.run(query, [email, hashedPassword], function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          return res.status(409).send("Email already exists.");
        }
        return res.status(500).send("Database error: " + err.message);
      }

      res.status(201).send({
        id: this.lastID,
        email,
      });
    });
  });
});

// 로그인 API
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send("이메일과 패스워드를 입력해주세요");
  }

  const query = `SELECT * FROM users WHERE email = ?`;

  db.get(query, [email], (err, user) => {
    if (err) {
      return res.status(500).send("DB 오류: " + err.message);
    }

    if (!user) {
      return res.status(404).send("이메일이 없습니다");
    }

    bcrypt.compare(password, user.password, (err, result) => {
      if (err) {
        return res.status(500).send("비밀번호 확인 중 오류 발생");
      }

      if (!result) {
        return res.status(401).send("패스워드가 틀립니다");
      }

      const token = jwt.sign(
        { id: user.id, email: user.email }, // payload
        secretKey,                          // 비밀 키
        { expiresIn: '1h' }                 // 옵션: 1시간 유효
      );

      res.send({
        message: "로그인 성공!",
        token: token
      });
    });
  });
});

// 서버 시작 시 테이블이 없으면 생성
db.serialize(() => {
  // users 테이블이 없으면 생성
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `);

  // articles 테이블이 없으면 생성
  db.run(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL
    );
  `);

  // articles 테이블에 user_id 컬럼이 없다면 추가
  // ALTER TABLE은 테이블이 이미 존재하는 경우에만 실행
  db.get('PRAGMA table_info(articles);', (err, columns) => {
    if (err) {
      console.error("테이블 정보 조회 실패:", err);
      return;
    }

    // user_id 컬럼이 없으면 추가
    const hasUserId = columns.some(col => col.name === 'user_id');
    if (!hasUserId) {
      db.run(`
        ALTER TABLE articles ADD COLUMN user_id INTEGER;
      `, (err) => {
        if (err) {
          console.error("user_id 컬럼 추가 실패:", err);
        } else {
          console.log("user_id 컬럼이 성공적으로 추가되었습니다.");
        }
      });
    }
  });

  // comments 테이블이 없으면 생성
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      article_id INTEGER NOT NULL,
      FOREIGN KEY (article_id) REFERENCES articles(id)
    );
  `);
});

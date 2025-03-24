const express = require('express');
const app = express();
// cors 문제해결
const cors = require('cors');
app.use(cors());
// json으로 된 post의 바디를 읽기 위해 필요
app.use(express.json())
const PORT = 3000;

//db 연결
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db');

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  });
  
app.post("/articles", (req, res)=>{

    let {title, content} = req.body

    db.run(`INSERT INTO articles (title, content) VALUES (?, ?)`,
    [title, content],
    function(err) {
      if (err) {
        return res.status(500).json({error: err.message});
      }
      res.json({id: this.lastID, title, content});
    });
})

// 커밋 한번해주세요

// 전체 아티클 리스트 주는 api를 만들어주세요
// GET : /articles

app.get('/articles',(req, res)=>{

    db.all("SELECT * FROM articles", [], (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(rows);  // returns the list of articles
      });

})

// 개별 아티클을 주는 api를 만들어주세요 
// GET : /articles/:id
app.get('/articles/:id', (req, res)=>{
    let id = req.params.id

    db.get("SELECT * FROM articles WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ message: "Article not found" });
        }
        res.json(row);  // returns the article with the given id
    });

})


app.delete("/articles/:id", (req, res)=>{
  const id = req.params.id


  const sql = 'DELETE FROM articles WHERE id = ?';
  db.run(sql, id, function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: err.message });
    }
    // this.changes는 영향을 받은 행의 수
    res.json({ message: `총 ${this.changes}개의 아티클이 삭제되었습니다.` });
  });

})

app.put('/articles/:id', (req, res)=>{
  let id = req.params.id
  // let title = req.body.title
  // let content = req.body.content
  let {title, content} = req.body
 // SQL 업데이트 쿼리 (파라미터 바인딩 사용)
 const sql = 'UPDATE articles SET title = ?, content = ? WHERE id = ?';
 db.run(sql, [title, content, id], function(err) {
   if (err) {
     console.error('업데이트 에러:', err.message);
     return res.status(500).json({ error: err.message });
   }
   // this.changes: 영향을 받은 행의 수
   res.json({ message: '게시글이 업데이트되었습니다.', changes: this.changes });
 });

})







app.get('/gettest/:id', (req, res)=>{

  console.log(req.query)
  console.log(req.params.id)


  res.send("ok")
})


app.post('/posttest', (req, res)=>{
  console.log(req.body)
  res.send("ok")
})








app.post("/articles/:id/comments", (req, res) => {
    let articleId = req.params.id;  // URL에서 받은 게시글 id
    let content = req.body.content;  // 댓글 내용
  



    // 댓글 내용을 comments 테이블에 추가하는 SQL 쿼리
    const sql = `
      INSERT INTO comments (content, article_id)
      VALUES (?, ?)
    `;
  
    // SQL 실행
    db.run(sql, [content, articleId], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });  // 에러 발생 시 500 응답
      }
  
      // 새로 추가된 댓글의 ID를 포함한 성공 응답
      res.status(201).json({
        message: 'Comment added successfully',
        comment: {
          id: this.lastID,  // 새로 생성된 댓글의 ID
          content: content,
          article_id: articleId
        }
      });
    });
  });
  








  
  app.get("/articles/:id/comments", (req, res) => {
    const articleId = req.params.id;  // URL에서 받은 게시글 id
  
    // 해당 게시글에 대한 댓글을 조회하는 SQL 쿼리
    const sql = `SELECT * FROM comments WHERE article_id = ?`;
  
    // 쿼리 실행
    db.all(sql, [articleId], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });  // 에러 발생 시 500 응답
      }
      if (rows.length === 0) {
        return res.status(404).json({ message: "No comments found for this article" });  // 댓글이 없으면 404 응답
      }
  
      // 댓글 목록 반환
      res.json(rows);  // 해당 게시글에 대한 모든 댓글 반환
    });
  });
  
import express, { response } from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";
const app = express();
const port = 3000;
var currentpage = "Home";
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    password: "123456789",
    database: "permalist",
    port: 5432
})
db.connect();

app.get("/",async(req,res)=>{
    try{
        if (currentpage==="Home"){
        const result = await db.query("SELECT * FROM books ORDER BY id ASC");
        const date = result.rows;
        res.render("index.ejs",{books_info:date,
                        currentpage:currentpage,
        })
    }}catch(err){
        console.log(err)
    };
});

app.post("/nav", async(req,res)=>{
    currentpage = req.body.nav
    res.redirect("/")

});

app.post("/addBook",async(req,res)=>{
    try{
       const bookData = await  axios.get("https://openlibrary.org/search.json?q=" + req.body.newBook.replaceAll(" ","+") + "&fields=key,title,author_name,editions,cover_i,first_publish_year");
       const firstBook = bookData.data.docs[0];
    const params = [
        firstBook.title || 'Unknown Title',
        firstBook.author_name ? firstBook.author_name.join(', ') : 'Unknown Author',
        firstBook.first_publish_year || null,
        firstBook.cover_i || null
    ];
    
    // Proper query formatting
    const query = {
        text: `INSERT INTO books (title, author, publish, cover)
               VALUES ($1, $2, $3, $4)`,
        values: params
    }
    await db.query(query);
    res.redirect("/")
    }catch(err){
        console.log(err)
    }
});

app.post('/books/:id', async (req, res) => {
    if (req.body.buttonType === "Delete"){
      await db.query('DELETE FROM books WHERE id = $1',[req.params.id]);
      res.redirect("/");
    }else {
        if(req.body.buttonType === "View"){
            const result = await db.query("SELECT * FROM books WHERE id = $1",[req.params.id]);
            currentpage = "View";
            res.render('index.ejs', { book: result.rows[0], 
                                      currentpage: currentpage});
        }
        if (req.body.buttonType === "Edit"){
            const result = await db.query("SELECT * FROM books WHERE id = $1",[req.params.id]);
            currentpage = "Edit";
            res.render('index.ejs', { book: result.rows[0], 
                                    currentpage: currentpage});
        }
    }
  });
  app.post('/books', async (req, res) => {
    try {
        const result = await db.query(`
            UPDATE books 
            SET 
                title = $1,
                author = $2,
                publish = $3,
                description = $4,
                date_read = $5,
                score = $6
            WHERE id = $7
            RETURNING *
        `, [
            req.body.bookTitle,
            req.body.bookAuthor,
            req.body.publishDate,
            req.body.bookNotes,
            req.body.dateRead,
            req.body.bookScore,
            req.body.BookId
        ]);
        currentpage = 'Home'
        res.redirect('/');
    } catch (error) {
        console.error("Error creating book:", error);
        res.status(500).send("Error creating book entry");
    }
});

app.listen(port, ()=>{
    console.log(`Server is running on port ${port}`);
});
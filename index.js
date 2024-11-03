// express/ejs and parser set up
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
const pg = require("pg");

// use to get the css
app.use(express.static('public'));

const db = new pg.Client({
    user: 'postgres',
    host: 'localhost',
    database: 'BlogDB',
    password: 'freund66',
    port: 5432,
});

let currentUser = null;

db.connect()

// store created/existing posts
let existingPosts = [];

// show the sign in page initially
app.get("/", async (req, res) => {
    if (currentUser === null) {
        res.redirect("/signin");
    } else {
        const result = await db.query('SELECT * FROM blogs ORDER BY date_created DESC');
        res.render("index.ejs", {
            blogs: result.rows,
            currentUser: currentUser
        });
    }
});

app.get('/signin', (req, res) => {
    res.render('signin');
});
app.post('/signin', (req, res) => {
    const { name, password } = req.body;
    const query = 'SELECT * FROM users WHERE name = $1 AND password = $2';
    db.query(query, [name, password], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error occurred during sign-in.');
        }
        if (result.rows.length > 0) {
            currentUser = {
                user_id: result.rows[0].user_id,
                name: result.rows[0].name
            };
            res.redirect('/home');
        } else {
            res.render('signin', { errorMessage: 'Invalid name or password. Please try again.' });
        }
    });
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', (req, res) => {
    const { name, password } = req.body;
    const checkQuery = 'SELECT * FROM users WHERE name = $1';

    db.query(checkQuery, [name], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error during sign-up.');
        }
        if (result.rows.length > 0) {
            return res.render('signup', { errorMessage: 'Username already taken, please choose another.' });
        }

        const query = 'INSERT INTO users (name, password) VALUES ($1, $2)';
        db.query(query, [name, password], (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send('Error during sign-up.');
            }
            res.redirect('/signin');
        });
    });
});

app.get('/home', (req, res) => {
    const query = 'SELECT * FROM blogs ORDER BY date_created DESC';
    db.query(query, (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error retrieving posts.');
        }
        res.render('index', { blogs: result.rows, currentUser: currentUser });
    });
});

// add existing posts to the main page
app.post('/createPost', (req, res) => {
    const { postTitle, postContent } = req.body;
    const query = 'INSERT INTO blogs (title, creator_name, body, date_created, creator_user_id) VALUES ($1, $2, $3, $4, $5)';
    
    db.query(query, [postTitle, currentUser.name, postContent, new Date(), currentUser.user_id], (err) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error occurred during post creation.');
        }
        res.redirect('/home');
    });
});

// get the post to edit
app.get('/editPost/:blog_id', (req, res) => {
    const postId = req.params.blog_id;

    db.query('SELECT * FROM blogs WHERE blog_id = $1', [postId], (err, result) => {
        if (err) {
            console.error('Error fetching post:', err);
            return res.status(500).send('Internal Server Error');
        }

        const post = result.rows[0];

        if (post.creator_user_id !== currentUser.user_id) {
            return res.render('index.ejs', {
                blogs: [],
                currentUser: currentUser,
                errorMessage: 'You do not have permission to edit this post.'
            });
        }

        res.render('edit', {
            post: post,
            currentUserId: currentUser.user_id,
            errorMessage: null
        });
    });
});

// save the edits for the post for the main page
app.post('/editPost/:blog_id', (req, res) => {
    const { postTitle, postAuthor, postContent } = req.body;
    const query = 'UPDATE blogs SET title = $1, creator_name = $2, body = $3 WHERE blog_id = $4';

    db.query(query, [postTitle, postAuthor, postContent, req.params.blog_id], (err) => {
        if (err) {
            console.error('Database error:', err);
            return res.render('edit', {
                post: { blog_id: req.params.blog_id, title: postTitle, creator_name: postAuthor, body: postContent },
                currentUserId: currentUser.user_id,
                errorMessage: 'Error occurred during post update. Please try again.'
            });
        }
        res.redirect('/home');
    });
});

// delete given post at given index
app.post('/deletePost', (req, res) => {
    const postId = req.body.id;
    const query = 'SELECT * FROM blogs WHERE blog_id = $1';

    db.query(query, [postId], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error occurred during post deletion.');
        }

        if (result.rows.length === 0 || result.rows[0].creator_user_id !== currentUser.user_id) {
            return res.render('index', {
                blogs: result.rows,
                currentUser: currentUser,
                errorMessage: 'You do not have permission to delete this post.'
            });
        }

        const deleteQuery = 'DELETE FROM blogs WHERE blog_id = $1';
        db.query(deleteQuery, [postId], (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send('Error occurred during post deletion.');
            }
            res.redirect('/home');
        });
    });
});

// basic run server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

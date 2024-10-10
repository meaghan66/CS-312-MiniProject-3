// express/ejs and parser set up
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// use to get the css
app.use(express.static('public'));

// store created/existing posts
let existingPosts = [];

// show the main page
app.get('/', (req, res) => {
    res.render('index.ejs', { existingPosts: existingPosts });
});

// add existing posts to the main page
app.post('/createPost', (req, res) => {
    // all elements of a post
    const post = {
        index: existingPosts.length + 1,
        postTitle: req.body.postTitle,
        postAuthor: req.body.postAuthor,
        postContent: req.body.postContent,
        date: new Date(),
    };
    // add post
    existingPosts.push(post);
    res.redirect('/');
});


// get the post to edit
app.get('/editPost/:index', (req, res) => {
    // retrieve the index for the post to edit
    const editingPost = existingPosts.find(foundPost => foundPost.index == req.params.index);
    res.render('edit.ejs', { post: editingPost });
});

// save the edits for the post for the main page
app.post('/editPost/:index', (req, res) => {
    // retrieve the index for the edited posts
    const editedPost = existingPosts.findIndex(editedPost => editedPost.index == req.params.index);
    // display information on main page
    existingPosts[editedPost] = {
        index: existingPosts[editedPost].index,
        postTitle: req.body.postTitle,
        postAuthor: req.body.postAuthor,
        postContent: req.body.postContent,
        date: existingPosts[editedPost].date,
    };
    res.redirect('/');
});

// delete given post at given index
app.post('/deletePost', (req, res) => {
    // get the index and remove from list
    const postIndex = existingPosts.findIndex(deletePost => deletePost.index == req.body.index);
    existingPosts.splice(postIndex, 1);
    res.redirect("/")
});

// basic run server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
